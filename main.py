#!/usr/bin/env python3
import os
import sys
import subprocess

# Add the api directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'api'))

# Change to api directory and run the app
os.chdir('api')
subprocess.run([sys.executable, 'app.py'])