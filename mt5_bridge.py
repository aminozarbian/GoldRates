import MetaTrader5 as mt5
import json
import time
import os
import logging
import signal
import sys
import traceback
from datetime import datetime

# Configuration
SYMBOL = "XAUUSD"
DATA_FILE = os.path.join(os.path.dirname(__file__), 'data', 'mt_prices.json')
LOG_FILE = os.path.join(os.path.dirname(__file__), 'logs', 'mt5_bridge.log')
UPDATE_INTERVAL = 5  # seconds

# Setup logging
os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)

def signal_handler(sig, frame):
    logging.info(f"Received signal: {sig}")
    if sig == signal.SIGINT:
        logging.info("Signal is SIGINT (KeyboardInterrupt/PM2 Stop)")
        raise KeyboardInterrupt
    elif sig == signal.SIGTERM:
        logging.info("Signal is SIGTERM (Termination Request)")
        sys.exit(0)

# Register signal handlers
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

def initialize_mt5():
    try:
        if not mt5.initialize():
            logging.error(f"initialize() failed, error code = {mt5.last_error()}")
            return False
        return True
    except Exception as e:
        logging.error(f"Exception during mt5.initialize(): {e}")
        return False

def get_price_data():
    symbol_info = mt5.symbol_info(SYMBOL)
    if symbol_info is None:
        logging.error(f"{SYMBOL} not found, can not call symbol_info()")
        return None

    if not symbol_info.visible:
        logging.info(f"{SYMBOL} is not visible, trying to switch on")
        if not mt5.symbol_select(SYMBOL, True):
            logging.error(f"symbol_select({SYMBOL}) failed, exit")
            return None

    # Get tick data
    tick = mt5.symbol_info_tick(SYMBOL)
    if tick is None:
        logging.error(f"symbol_info_tick({SYMBOL}) failed")
        return None

    # Calculate spread
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
    except Exception as e:
        logging.error(f"Error saving JSON: {e}")

def main():
    logging.info("Starting MT5 Bridge...")
    
    # Check if MT5 is actually installed/callable
    try:
        if not initialize_mt5():
            logging.error("Failed to initialize MT5. Retrying in 60 seconds...")
            # Sleep to prevent rapid restarts/flapping in PM2
            time.sleep(60)
            return
    except Exception as e:
        logging.error(f"Critical error during initialization: {e}")
        time.sleep(60)
        return

    logging.info(f"Connected to MT5. Fetching {SYMBOL}...")
    
    try:
        while True:
            data = get_price_data()
            if data:
                save_to_json(data)
            
            time.sleep(UPDATE_INTERVAL)
    except KeyboardInterrupt:
        logging.info("Stopping bridge due to KeyboardInterrupt (SIGINT)...")
    except SystemExit:
        logging.info("Stopping bridge due to SystemExit...")
    except Exception as e:
        logging.error(f"Unexpected error in main loop: {e}")
        logging.error(traceback.format_exc())
        # Sleep a bit before crashing so logs aren't flooded
        time.sleep(10)
    finally:
        logging.info("Shutting down MT5 connection...")
        mt5.shutdown()
        logging.info("Bridge stopped.")

if __name__ == "__main__":
    main()
