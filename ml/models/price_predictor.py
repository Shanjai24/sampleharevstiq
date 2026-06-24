import numpy as np
from sklearn.linear_model import LinearRegression

class PricePredictor:
    def __init__(self):
        self.model = LinearRegression()

    def predict(self, prices, days_ahead=7):
        """Predict future prices from historical data."""
        if not prices or len(prices) < 5:
            return {
                'predictedPrices': [],
                'trend': 'STABLE',
                'changePercent': 0
            }

        y = np.array([p['price'] if isinstance(p, dict) else p for p in prices])
        X = np.arange(len(y)).reshape(-1, 1)

        self.model.fit(X, y)

        future_X = np.arange(len(y), len(y) + days_ahead).reshape(-1, 1)
        predicted = self.model.predict(future_X)

        # Calculate trend
        current_avg = float(np.mean(y[-7:]))
        predicted_avg = float(np.mean(predicted))
        change = ((predicted_avg - current_avg) / current_avg) * 100

        if change > 3:
            trend = 'UP'
        elif change < -3:
            trend = 'DOWN'
        else:
            trend = 'STABLE'

        predicted_prices = [
            {'day': i + 1, 'price': round(float(p))}
            for i, p in enumerate(predicted)
        ]

        return {
            'predictedPrices': predicted_prices,
            'trend': trend,
            'changePercent': round(change, 1)
        }
