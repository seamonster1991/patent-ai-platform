"""
Supabase client utilities for Vercel serverless functions
"""

import os
import requests
from typing import Optional, Dict, Any
import json

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://afzzubvlotobcaiflmia.supabase.co")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Supabase API headers
SUPABASE_HEADERS = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    "Content-Type": "application/json"
}

def supabase_query(table: str, select: str = "*", filters: dict = None, count: bool = False):
    """Helper function to query Supabase using REST API"""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    params = {"select": select}
    
    headers = SUPABASE_HEADERS.copy()
    if count:
        headers["Prefer"] = "count=exact"
    
    if filters:
        for key, value in filters.items():
            params[key] = value
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=30)
        response.raise_for_status()
        
        if count:
            count_value = 0
            if "Content-Range" in response.headers:
                range_header = response.headers["Content-Range"]
                if "/" in range_header:
                    count_value = int(range_header.split("/")[-1])
            else:
                count_value = len(response.json())
            
            return {
                "data": response.json(),
                "count": count_value
            }
        return {"data": response.json()}
    except Exception as e:
        print(f"Supabase query error for table {table}: {e}")
        return {"data": [], "count": 0}

def supabase_aggregate_query(table: str, select: str, filters: dict = None):
    """Helper function for aggregate queries"""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    params = {"select": select}
    
    if filters:
        for key, value in filters.items():
            params[key] = value
    
    try:
        response = requests.get(url, headers=SUPABASE_HEADERS, params=params, timeout=30)
        response.raise_for_status()
        result = response.json()
        return result[0] if result else {}
    except Exception as e:
        print(f"Supabase aggregate query error for table {table}: {e}")
        return {}

def supabase_insert(table: str, data: dict):
    """Insert data into Supabase table"""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    
    try:
        response = requests.post(url, headers=SUPABASE_HEADERS, json=data, timeout=30)
        response.raise_for_status()
        return {"success": True, "data": response.json()}
    except Exception as e:
        print(f"Supabase insert error for table {table}: {e}")
        return {"success": False, "error": str(e)}

def supabase_update(table: str, filters: dict, data: dict):
    """Update data in Supabase table"""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    params = {}
    
    if filters:
        for key, value in filters.items():
            params[key] = value
    
    try:
        response = requests.patch(url, headers=SUPABASE_HEADERS, params=params, json=data, timeout=30)
        response.raise_for_status()
        return {"success": True, "data": response.json()}
    except Exception as e:
        print(f"Supabase update error for table {table}: {e}")
        return {"success": False, "error": str(e)}

def supabase_delete(table: str, filters: dict):
    """Delete data from Supabase table"""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    params = {}
    
    if filters:
        for key, value in filters.items():
            params[key] = value
    
    try:
        response = requests.delete(url, headers=SUPABASE_HEADERS, params=params, timeout=30)
        response.raise_for_status()
        return {"success": True, "data": response.json()}
    except Exception as e:
        print(f"Supabase delete error for table {table}: {e}")
        return {"success": False, "error": str(e)}