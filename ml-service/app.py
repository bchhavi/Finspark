from flask import Flask, request, jsonify
import pandas as pd
from prophet import Prophet
import datetime
from sklearn.ensemble import IsolationForest
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler


app = Flask(__name__)

@app.route('/api/forecast', methods=['POST'])
def generate_forecast():
    try:
        # 1. Get historical data from Node.js
        data = request.json.get('historical_data', [])
        
        if not data or len(data) < 2:
            return jsonify({"error": "Not enough historical data for Prophet"}), 400

        # 2. Convert to Pandas DataFrame
        # Prophet STRICTLY requires columns named 'ds' (datestamp) and 'y' (value)
        df = pd.DataFrame(data)
        df.columns = ['ds', 'y']
        df['ds'] = pd.to_datetime(df['ds'])

        # 3. Initialize and Train Facebook Prophet
        # We disable yearly/weekly seasonality because we only have 30 days of data for the demo
        m = Prophet(daily_seasonality=True, yearly_seasonality=False, weekly_seasonality=True)
        m.fit(df)

        # 4. Predict the next 15 days
        future = m.make_future_dataframe(periods=15)
        forecast = m.predict(future)

        # 5. Format the output to send back to Node.js
        # We only care about 'ds' (date) and 'yhat' (the predicted value)
        result = []
        for index, row in forecast.iterrows():
            date_str = row['ds'].strftime('%Y-%m-%d')
            # If it's in the past/present, use the actual 'y' value from our input if available
            actual_val = df[df['ds'] == row['ds']]['y'].values
            
            result.append({
                "date": date_str,
                "actual": int(actual_val[0]) if len(actual_val) > 0 else None,
                "predicted": max(0, int(row['yhat'])) # Prevent negative predictions
            })

        return jsonify({"success": True, "forecast": result})

    except Exception as e:
        print(f"Prophet Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


from sklearn.ensemble import IsolationForest # <-- ADD THIS IMPORT AT THE TOP

# ==========================================
# NEW: ISOLATION FOREST ANOMALY DETECTION
# ==========================================
@app.route('/api/anomaly', methods=['POST'])
def detect_anomaly():
    try:
        data = request.json.get('funnel_data', [])
        
        # We need at least a few days of data to find an anomaly
        if not data or len(data) < 5:
            return jsonify({"success": True, "anomalies": []})

        df = pd.DataFrame(data)
        
        # We are looking for anomalies in the 'dropoff_rate'
        X = df[['dropoff_rate']].values
        
        # Initialize Isolation Forest
        # contamination=0.1 means we expect roughly 10% of our data to be anomalies (outliers)
        model = IsolationForest(contamination=0.1, random_state=42)
        df['anomaly'] = model.fit_predict(X)
        
        # -1 means ANOMALY. 1 means NORMAL.
        anomalies_df = df[df['anomaly'] == -1]
        
        # Only flag it if the dropoff rate is actually HIGH (ignore unusually *good* days)
        bad_anomalies = anomalies_df[anomalies_df['dropoff_rate'] > df['dropoff_rate'].mean()]
        
        result = bad_anomalies.to_dict('records')
        return jsonify({"success": True, "anomalies": result})

    except Exception as e:
        print(f"Anomaly ML Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# ==========================================
# NEW: K-MEANS TENANT SEGMENTATION
# ==========================================
@app.route('/api/segment', methods=['POST'])
def segment_tenants():
    try:
        data = request.json.get('tenant_data', [])
        
        # We need at least 3 tenants to make meaningful clusters
        if not data or len(data) < 3:
            return jsonify({"success": True, "clusters": []})

        df = pd.DataFrame(data)
        
        # Features we will use to cluster the tenants
        X = df[['total_events', 'unique_features', 'login_count']]
        
        # Standardize the data (Critical for K-Means so large numbers don't overpower small ones)
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        # Apply K-Means (Group into 3 distinct behavioral segments)
        num_clusters = min(3, len(df)) # Fallback if we have fewer than 3 tenants somehow
        kmeans = KMeans(n_clusters=num_clusters, random_state=42, n_init=10)
        df['cluster'] = kmeans.fit_predict(X_scaled)
        
        # Assign business-friendly names to the clusters based on their activity volume
        # We sort cluster centers by total activity to label them Low, Medium, High
        cluster_centers = df.groupby('cluster')['total_events'].mean().sort_values()
        labels = {
            cluster_centers.index[0]: "At-Risk / Low Engagement",
            cluster_centers.index[1]: "Standard Users",
            cluster_centers.index[-1]: "Power Users (Upsell Targets)"
        }
        
        df['segment_name'] = df['cluster'].map(labels)
        
        # Return the mapped data
        result = df.to_dict('records')
        return jsonify({"success": True, "clusters": result})

    except Exception as e:
        print(f"K-Means ML Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == '__main__':
    # Run on port 5000 so it doesn't conflict with React (3000) or Node (4000)
    app.run(port=5000, debug=True)