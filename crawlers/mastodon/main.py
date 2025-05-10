import os
import logging
from datetime import datetime, timedelta
from retrying import retry
from pymongo import MongoClient
from mastodon import Mastodon
import configparser
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://mongodb:27017/')
DB_NAME = os.getenv('DB_NAME', 'social_media')
COLLECTION_NAME = os.getenv('COLLECTION_NAME', 'mastodon_data')

def read_config(config_file):
    """Read configuration data from an INI file."""
    config = configparser.ConfigParser()
    try:
        with open(config_file, 'r', encoding='utf-8') as file:
            config.read_file(file)
        return config
    except Exception as e:
        logger.error(f"Error reading from INI file: {str(e)}")
        raise

def initialize_mastodon(api_base_url, user_email, user_pass):
    """Initialize a Mastodon API user instance."""
    try:
        # Create a Mastodon application
        client_token_path = 'client.secret'
        user_token_path = 'user.secret'
        
        if not os.path.exists(client_token_path):
            Mastodon.create_app(
                "pytooterapp",
                api_base_url=api_base_url,
                to_file=client_token_path
            )
        
        # Authorize application
        mastodon = Mastodon(client_id=client_token_path)
        mastodon.log_in(user_email, user_pass, to_file=user_token_path)
        
        # Set up Mastodon API user instance
        mastodon = Mastodon(api_base_url=api_base_url, access_token=user_token_path)
        return mastodon
    except Exception as e:
        logger.error(f"Error initializing Mastodon: {str(e)}")
        raise

@retry(wait_fixed=60000)  # Retry every minute
def fetch_toots(mastodon, limit=40, max_id=None, min_id=None, since_id=None):
    """Fetch toots from Mastodon API."""
    try:
        results = mastodon.timeline_public(
            limit=limit,
            max_id=max_id,
            min_id=min_id,
            since_id=since_id
        )
        return results
    except Exception as e:
        logger.error(f"Error fetching toots: {str(e)}")
        raise

def save_toots_to_mongodb(toots, collection, run_id):
    """Save toots to MongoDB."""
    try:
        for toot in toots:
            toot['run_id'] = run_id
            toot['crawled_at'] = datetime.utcnow()
            collection.update_one(
                {'id': toot['id']},
                {'$set': toot},
                upsert=True
            )
    except Exception as e:
        logger.error(f"Error saving toots to MongoDB: {str(e)}")
        raise

def main():
    # Get configuration from environment variables
    api_base_url = os.getenv('MASTODON_API_URL')
    user_email = os.getenv('MASTODON_USER_EMAIL')
    user_pass = os.getenv('MASTODON_USER_PASS')
    run_id = os.getenv('RUN_ID', datetime.utcnow().strftime('%Y%m%d_%H%M%S'))
    
    if not all([api_base_url, user_email, user_pass]):
        raise ValueError("Missing required environment variables")
    
    # Initialize MongoDB connection
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]
    
    # Initialize Mastodon
    mastodon = initialize_mastodon(api_base_url, user_email, user_pass)
    
    # Get the last toot ID from MongoDB
    last_toot = collection.find_one(
        {'run_id': run_id},
        sort=[('id', -1)]
    )
    since_id = last_toot['id'] if last_toot else None
    
    # Fetch and save toots
    while True:
        try:
            toots = fetch_toots(mastodon, since_id=since_id)
            if not toots:
                break
                
            save_toots_to_mongodb(toots, collection, run_id)
            since_id = toots[-1]['id']
            
        except Exception as e:
            logger.error(f"Error in main loop: {str(e)}")
            break

if __name__ == "__main__":
    main() 