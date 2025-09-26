#!/usr/bin/env python3
import os
import sys
import uvicorn

# Add the api directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'api'))

# Change to api directory
os.chdir('api')

# Import and run the FastAPI app directly
from app import app

if __name__ == "__main__":
    port = int(os.getenv('PORT', 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
