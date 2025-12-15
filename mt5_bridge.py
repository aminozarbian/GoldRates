import MetaTrader5 as mt5
import json
import time
import os
from datetime import datetime

# Configuration
SYMBOL = "XAUUSD"
DATA_FILE = os.path.join(os.path.dirname(__file__), 'data', 'mt_prices.json')
UPDATE_INTERVAL = 5  # seconds

def initialize_mt5():
    if not mt5.initialize():
        print(f"initialize() failed, error code = {mt5.last_error()}")
        return False
    return True

def get_price_data():
    symbol_info = mt5.symbol_info(SYMBOL)
    if symbol_info is None:
        print(f"{SYMBOL} not found, can not call symbol_info()")
        return None

    if not symbol_info.visible:
        print(f"{SYMBOL} is not visible, trying to switch on")
        if not mt5.symbol_select(SYMBOL, True):
            print(f"symbol_select({SYMBOL}) failed, exit")
            return None

    # Get tick data
    tick = mt5.symbol_info_tick(SYMBOL)
    if tick is None:
        print(f"symbol_info_tick({SYMBOL}) failed")
        return None

    # Calculate spread
    # Note: MT5 spread is often in points. 
    # Real spread = ask - bid
    spread = tick.ask - tick.bid
    
    return {
        "symbol": SYMBOL,
        "bid": tick.bid,
        "ask": tick.ask,
        "spread": round(spread, 2),
        "spread_points": mt5.symbol_info(SYMBOL).spread,
        "timestamp": datetime.now().isoformat(),
        "time": tick.time
    }

def save_to_json(data):
    try:
        # Ensure directory exists
        os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
        
        with open(DATA_FILE, 'w') as f:
            json.dump({"broker_xau_usd": data}, f, indent=2)
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {data['symbol']} | Bid: {data['bid']} | Ask: {data['ask']} | Spread: {data['spread']}", flush=True)
    except Exception as e:
        print(f"Error saving JSON: {e}")

def main():
    print("Starting MT5 Bridge...", flush=True)
    if not initialize_mt5():
        return

    print(f"Connected to MT5. Fetching {SYMBOL}...", flush=True)
    
    try:
        while True:
            data = get_price_data()
            if data:
                save_to_json(data)
            
            time.sleep(UPDATE_INTERVAL)
    except KeyboardInterrupt:
        print("\nStopping bridge...")
    finally:
        mt5.shutdown()

if __name__ == "__main__":
    main()
