import os
import json
import pymongo
from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

# Load environment variables
load_dotenv()

# MongoDB connection
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://mongodb:27017/')
DB_NAME = os.getenv('DB_NAME', 'social_media')
COLLECTION_NAME = os.getenv('COLLECTION_NAME', 'tiktok_data')

def setup_driver():
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    return driver

def connect_to_mongodb():
    client = pymongo.MongoClient(MONGO_URI)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]
    return collection

def crawl_tiktok(hashtag, limit=100):
    driver = setup_driver()
    collection = connect_to_mongodb()
    
    try:
        # TODO: Implement TikTok crawling logic here
        # This is a placeholder for the actual crawling implementation
        data = {
            'hashtag': hashtag,
            'timestamp': datetime.now().isoformat(),
            'data': []  # This will be populated with actual crawled data
        }
        
        # Save to MongoDB
        collection.insert_one(data)
        
    finally:
        driver.quit()

if __name__ == "__main__":
    # Get parameters from environment variables or command line arguments
    hashtag = os.getenv('HASHTAG', 'default_hashtag')
    limit = int(os.getenv('LIMIT', '100'))
    
    crawl_tiktok(hashtag, limit) 