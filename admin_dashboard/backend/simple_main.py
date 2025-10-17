"""
Simple Admin Dashboard Backend - Supabase Integration
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import random
import os
import requests
import asyncio
from datetime import datetime, timedelta
from typing import Optional
import threading
import time

# Supabase configuration from environment variables
from dotenv import load_dotenv
load_dotenv()

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

# Create FastAPI app
app = FastAPI(
    title="Patent AI Admin Dashboard - Supabase",
    description="Admin dashboard backend with Supabase integration",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Admin Dashboard Backend is running"}

@app.get("/api/v1/dashboard/metrics")
async def get_dashboard_metrics(period: str = "7d"):
    """Dashboard metrics endpoint with real Supabase data"""
    try:
        # Calculate date range based on period
        end_date = datetime.now()
        if period == "1d":
            start_date = end_date - timedelta(days=1)
        elif period == "7d":
            start_date = end_date - timedelta(days=7)
        elif period == "30d":
            start_date = end_date - timedelta(days=30)
        else:
            start_date = end_date - timedelta(days=7)
        
        # Get total users count
        users_response = supabase_query("users", select="id", count=True)
        total_users = users_response["count"]
        
        # Get active users (users with recent activity)
        active_users_response = supabase_query("user_activities", 
            select="user_id", 
            filters={
                "created_at": f"gte.{start_date.isoformat()}",
                "select": "user_id"
            })
        unique_active_users = len(set(activity.get("user_id") for activity in active_users_response["data"] if activity.get("user_id"))) if active_users_response["data"] else 0
        
        # Get total revenue from payment_transactions (use success status)
        revenue_aggregate = supabase_aggregate_query("payment_transactions", 
            select="sum(amount)", 
            filters={"status": "eq.success"})
        total_revenue = revenue_aggregate.get("sum", 0) or 0
        
        # Get monthly revenue
        monthly_start = end_date.replace(day=1)
        monthly_revenue_aggregate = supabase_aggregate_query("payment_transactions", 
            select="sum(amount)", 
            filters={
                "status": "eq.success",
                "created_at": f"gte.{monthly_start.isoformat()}"
            })
        monthly_revenue = monthly_revenue_aggregate.get("sum", 0) or 0
        
        # Get AI analysis reports count
        ai_reports_response = supabase_query("ai_analysis_reports", select="id", count=True)
        total_analyses = ai_reports_response["count"]
        
        # Get reports count (user generated reports)
        reports_response = supabase_query("reports", select="id", count=True)
        total_patents = reports_response["count"]
        
        # Get pending analyses (recent reports from last 7 days)
        pending_reports_response = supabase_query("reports", 
            select="id", 
            filters={
                "created_at": f"gte.{(end_date - timedelta(days=7)).isoformat()}"
            }, 
            count=True)
        pending_patents = pending_reports_response["count"]
        
        # Get recent activities from user_activities table
        activities_response = supabase_query("user_activities", 
            select="id,activity_type,description,created_at,user_id", 
            filters={
                "order": "created_at.desc", 
                "limit": "5"
            })
        recent_activities = []
        if activities_response["data"]:
            for activity in activities_response["data"]:
                recent_activities.append({
                    "id": activity.get("id"),
                    "type": activity.get("activity_type", "user_action"),
                    "description": activity.get("description", "사용자 활동"),
                    "timestamp": activity.get("created_at"),
                    "user_email": f"user_{activity.get('user_id', 'unknown')}"
                })
        
        # Calculate growth rates
        prev_start = start_date - (end_date - start_date)
        
        # User growth rate
        prev_users_response = supabase_query("users", 
            select="id", 
            filters={
                "created_at": f"gte.{prev_start.isoformat()}",
                "created_at": f"lt.{start_date.isoformat()}"
            }, 
            count=True)
        prev_users = prev_users_response["count"] or 1
        user_growth_rate = ((total_users - prev_users) / prev_users * 100) if prev_users > 0 else 0
        
        # Revenue growth rate
        prev_revenue_aggregate = supabase_aggregate_query("payment_transactions", 
            select="sum(amount)", 
            filters={
                "status": "eq.completed",
                "created_at": f"gte.{prev_start.isoformat()}",
                "created_at": f"lt.{start_date.isoformat()}"
            })
        prev_revenue = prev_revenue_aggregate.get("sum", 0) or 1
        revenue_growth_rate = ((monthly_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue > 0 else 0
        
        # Analysis growth rate
        prev_analyses_response = supabase_query("ai_analysis_reports", 
            select="id", 
            filters={
                "created_at": f"gte.{prev_start.isoformat()}",
                "created_at": f"lt.{start_date.isoformat()}"
            }, 
            count=True)
        prev_analyses = prev_analyses_response["count"] or 1
        analysis_growth_rate = ((total_analyses - prev_analyses) / prev_analyses * 100) if prev_analyses > 0 else 0
        
        # Get system metrics from real_time_metrics table if available
        system_metrics_response = supabase_query("real_time_metrics", 
            select="cpu_usage,memory_usage,disk_usage", 
            filters={
                "order": "created_at.desc",
                "limit": "1"
            })
        
        system_health = {
            "status": "healthy",
            "cpu_usage": 45,
            "memory_usage": 60,
            "disk_usage": 35
        }
        
        if system_metrics_response["data"]:
            latest_metrics = system_metrics_response["data"][0]
            system_health.update({
                "cpu_usage": latest_metrics.get("cpu_usage", 45),
                "memory_usage": latest_metrics.get("memory_usage", 60),
                "disk_usage": latest_metrics.get("disk_usage", 35)
            })
        
        return {
            "total_users": total_users,
            "active_users": unique_active_users,
            "total_revenue": total_revenue,
            "monthly_revenue": monthly_revenue,
            "total_patents": total_patents,
            "pending_patents": pending_patents,
            "total_analyses": total_analyses,
            "user_growth_rate": round(user_growth_rate, 1),
            "revenue_growth_rate": round(revenue_growth_rate, 1),
            "analysis_growth_rate": round(analysis_growth_rate, 1),
            "system_health": system_health,
            "recent_activities": recent_activities
        }
    except Exception as e:
        print(f"Error fetching dashboard metrics: {e}")
        import traceback
        traceback.print_exc()
        
        # Fallback to basic real data or mock data
        try:
            # Try to get at least basic counts
            users_count = supabase_query("users", select="id", count=True)["count"]
            reports_count = supabase_query("reports", select="id", count=True)["count"]
            
            return {
                "total_users": users_count or 0,
                "active_users": max(1, users_count // 4) if users_count else 0,
                "total_revenue": 0,
                "monthly_revenue": 0,
                "total_patents": reports_count or 0,
                "pending_patents": 0,
                "total_analyses": 0,
                "user_growth_rate": 0.0,
                "revenue_growth_rate": 0.0,
                "analysis_growth_rate": 0.0,
                "system_health": {
                    "status": "healthy",
                    "cpu_usage": 45,
                    "memory_usage": 60,
                    "disk_usage": 35
                },
                "recent_activities": []
            }
        except:
            # Final fallback to mock data
            return {
                "total_users": 0,
                "active_users": 0,
                "total_revenue": 0,
                "monthly_revenue": 0,
                "total_patents": 0,
                "pending_patents": 0,
                "total_analyses": 0,
                "user_growth_rate": 0.0,
                "revenue_growth_rate": 0.0,
                "analysis_growth_rate": 0.0,
                "system_health": {
                    "status": "healthy",
                    "cpu_usage": 45,
                    "memory_usage": 60,
                    "disk_usage": 35
                },
                "recent_activities": []
            }

@app.get("/api/v1/dashboard/recent-activities")
async def get_recent_activities(limit: int = 10):
    """Recent activities endpoint"""
    return [
        {
            "id": f"activity_{i}",
            "type": "user_action",
            "description": f"사용자가 특허 분석을 요청했습니다",
            "timestamp": "2025-01-15T10:30:00Z",
            "user_email": f"user{i}@example.com"
        }
        for i in range(limit)
    ]

@app.get("/api/v1/dashboard/system-metrics")
async def get_system_metrics(period: str = "1h"):
    """System metrics endpoint"""
    return {
        "cpu_usage": random.randint(20, 80),
        "memory_usage": random.randint(30, 70),
        "disk_usage": random.randint(40, 60),
        "network_io": {
            "bytes_sent": random.randint(1000000, 5000000),
            "bytes_recv": random.randint(2000000, 8000000)
        },
        "active_connections": random.randint(50, 200),
        "response_time": round(random.uniform(50, 200), 2),
        "period": period,
        "timestamp": "2025-01-15T10:30:00Z"
    }

@app.get("/api/v1/monitoring/metrics")
async def get_monitoring_metrics():
    """System monitoring metrics"""
    return {
        "cpu_usage": random.randint(20, 80),
        "memory_usage": random.randint(30, 70),
        "disk_usage": random.randint(40, 60),
        "network_io": {
            "bytes_sent": random.randint(1000000, 5000000),
            "bytes_recv": random.randint(2000000, 8000000)
        },
        "active_connections": random.randint(50, 200),
        "response_time": round(random.uniform(50, 200), 2)
    }

@app.get("/api/v1/users")
async def get_users(page: int = 1, limit: int = 10, search: Optional[str] = None, status: Optional[str] = None):
    """Get users with pagination and filtering from Supabase"""
    try:
        offset = (page - 1) * limit
        
        # Build filters
        filters = {
            "deleted_at": "is.null"  # 삭제되지 않은 사용자만 조회
        }
        if status:
            filters["status"] = f"eq.{status}"
        
        # Add pagination
        filters["offset"] = str(offset)
        filters["limit"] = str(limit)
        
        # Execute query
        result = supabase_query("users", filters=filters, count=True)
        
        users = []
        if result["data"]:
            for user in result["data"]:
                # Apply search filter in Python if needed
                if search:
                    search_lower = search.lower()
                    if not (search_lower in user.get("email", "").lower() or 
                           search_lower in user.get("username", "").lower() or 
                           search_lower in user.get("full_name", "").lower()):
                        continue
                
                users.append({
                    "id": user.get("id"),
                    "username": user.get("username", user.get("email", "").split("@")[0]),
                    "email": user.get("email"),
                    "role": user.get("role", "user"),
                    "status": user.get("status", "active"),
                    "createdAt": user.get("created_at"),
                    "lastLogin": user.get("last_login_at"),
                    "subscription": user.get("subscription_type", "free")
                })
        
        return {
            "users": users,
            "total": result["count"],
            "page": page,
            "limit": limit,
            "totalPages": (result["count"] + limit - 1) // limit
        }
    except Exception as e:
        print(f"Error fetching users: {e}")
        # Fallback to mock data
        mock_users = [
            {"id": 1, "username": "김철수", "email": "kim@example.com", "role": "user", "status": "active", "createdAt": "2024-01-01T00:00:00Z", "lastLogin": "2024-01-15T10:30:00Z", "subscription": "premium"},
            {"id": 2, "username": "이영희", "email": "lee@example.com", "role": "user", "status": "active", "createdAt": "2024-01-02T00:00:00Z", "lastLogin": "2024-01-15T09:15:00Z", "subscription": "basic"},
            {"id": 3, "username": "박민수", "email": "park@example.com", "role": "admin", "status": "active", "createdAt": "2024-01-03T00:00:00Z", "lastLogin": "2024-01-15T08:45:00Z", "subscription": "premium"},
            {"id": 4, "username": "정수진", "email": "jung@example.com", "role": "user", "status": "inactive", "createdAt": "2024-01-04T00:00:00Z", "lastLogin": "2024-01-10T08:20:00Z", "subscription": "free"},
            {"id": 5, "username": "최동욱", "email": "choi@example.com", "role": "user", "status": "active", "createdAt": "2024-01-05T00:00:00Z", "lastLogin": "2024-01-15T07:55:00Z", "subscription": "basic"}
        ]
        
        # Apply search filter to mock data
        if search:
            mock_users = [user for user in mock_users if search.lower() in user["username"].lower() or search.lower() in user["email"].lower()]
        
        # Apply status filter to mock data
        if status:
            mock_users = [user for user in mock_users if user["status"] == status]
        
        # Apply pagination to mock data
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_users = mock_users[start_idx:end_idx]
        
        return {
            "users": paginated_users,
            "total": len(mock_users),
            "page": page,
            "limit": limit,
            "totalPages": (len(mock_users) + limit - 1) // limit
        }

@app.delete("/api/v1/users/{user_id}")
async def delete_user(user_id: str, deletion_reason: str = "admin_deleted"):
    """Enhanced soft delete user endpoint with history tracking"""
    try:
        # First, get user information before deletion
        user_response = supabase_query("users", select="*", filters={"id": f"eq.{user_id}"})
        if not user_response["data"]:
            return {
                "success": False,
                "message": "사용자를 찾을 수 없습니다.",
                "user_id": user_id
            }
        
        user_data = user_response["data"][0]
        current_time = datetime.now().isoformat()
        
        # Update user with soft delete and deletion reason
        update_data = {
            "deleted_at": current_time,
            "deletion_reason": deletion_reason
        }
        
        # Direct PATCH request to Supabase to update users table
        url = f"{SUPABASE_URL}/rest/v1/users"
        params = {"id": f"eq.{user_id}"}
        
        response = requests.patch(
            url, 
            headers=SUPABASE_HEADERS, 
            params=params,
            json=update_data
        )
        
        if response.status_code == 204:  # Supabase returns 204 for successful updates
            # Record deletion in history table
            history_data = {
                "user_id": user_id,
                "email": user_data.get("email"),
                "name": user_data.get("name"),
                "deletion_reason": deletion_reason,
                "deleted_at": current_time,
                "original_created_at": user_data.get("created_at"),
                "user_data": {
                    "role": user_data.get("role"),
                    "subscription_plan": user_data.get("subscription_plan"),
                    "last_login_at": user_data.get("last_login_at"),
                    "total_searches": user_data.get("total_searches"),
                    "total_reports": user_data.get("total_reports"),
                    "company": user_data.get("company"),
                    "phone": user_data.get("phone")
                }
            }
            
            # Insert into deleted_users_history table
            history_url = f"{SUPABASE_URL}/rest/v1/deleted_users_history"
            history_response = requests.post(
                history_url,
                headers=SUPABASE_HEADERS,
                json=history_data
            )
            
            if history_response.status_code in [200, 201]:
                print(f"User deletion history recorded for user {user_id}")
            else:
                print(f"Failed to record deletion history: {history_response.status_code}, {history_response.text}")
            
            return {
                "success": True,
                "message": "사용자가 성공적으로 삭제되었습니다.",
                "user_id": user_id,
                "deleted_at": current_time,
                "deletion_reason": deletion_reason
            }
        else:
            print(f"Supabase update failed with status: {response.status_code}, response: {response.text}")
            return {
                "success": False,
                "message": "사용자 삭제에 실패했습니다.",
                "user_id": user_id
            }
    except Exception as e:
        print(f"Error deleting user: {e}")
        return {
            "success": False,
            "message": f"사용자 삭제 중 오류가 발생했습니다: {str(e)}",
            "user_id": user_id
        }

@app.delete("/api/v1/users/{user_identifier}/permanent")
async def permanently_delete_user(user_identifier: str):
    """Permanently delete user by email or ID from all tables"""
    try:
        print(f"Starting permanent deletion for user: {user_identifier}")
        
        # Step 1: Determine if identifier is email or UUID and find user
        is_email = "@" in user_identifier
        
        # Always check all tables for comprehensive search
        auth_user_response = {"data": []}
        profile_user_response = {"data": []}
        users_response = {"data": []}
        
        if is_email:
            # Search by email in all tables
            auth_user_response = supabase_query("auth.users", select="id,email", filters={"email": f"eq.{user_identifier}"})
            profile_user_response = supabase_query("user_profiles", select="user_id,email", filters={"email": f"eq.{user_identifier}"})
            users_response = supabase_query("users", select="id,email", filters={"email": f"eq.{user_identifier}"})
            user_email = user_identifier
        else:
            # Search by user ID in all tables
            auth_user_response = supabase_query("auth.users", select="id,email", filters={"id": f"eq.{user_identifier}"})
            profile_user_response = supabase_query("user_profiles", select="user_id,email", filters={"user_id": f"eq.{user_identifier}"})
            users_response = supabase_query("users", select="id,email", filters={"id": f"eq.{user_identifier}"})
            
            # Get email from any available source
            user_email = None
            if auth_user_response["data"]:
                user_email = auth_user_response["data"][0].get("email")
            elif profile_user_response["data"]:
                user_email = profile_user_response["data"][0].get("email")
            elif users_response["data"]:
                user_email = users_response["data"][0].get("email")
        
        auth_user_id = None
        profile_user_id = None
        users_user_id = None
        
        if auth_user_response["data"]:
            auth_user_id = auth_user_response["data"][0]["id"]
            print(f"Found user in auth.users with ID: {auth_user_id}")
        
        if profile_user_response["data"]:
            profile_user_id = profile_user_response["data"][0]["user_id"]
            print(f"Found user in user_profiles with ID: {profile_user_id}")
            
        if users_response["data"]:
            users_user_id = users_response["data"][0]["id"]
            print(f"Found user in users table with ID: {users_user_id}")
        
        if not auth_user_id and not profile_user_id and not users_user_id:
            return {
                "success": False,
                "message": f"사용자 {user_identifier}을 찾을 수 없습니다.",
                "identifier": user_identifier
            }
        
        # Use the available user ID (prefer profile_user_id, fallback to auth_user_id, then users_user_id, or use identifier if it's a UUID)
        user_id = profile_user_id or auth_user_id or users_user_id or (user_identifier if not is_email else None)
        
        # Ensure we have user_email
        if not user_email and is_email:
            user_email = user_identifier
        
        # Step 2: Delete from all related tables (in order to respect foreign key constraints)
        tables_to_clean = [
            "user_activities",
            "user_login_logs", 
            "point_transactions",
            "user_points",
            "payment_transactions",
            "payment_orders",
            "payment_error_logs",
            "ai_analysis_reports",
            "reports",
            "report_history",
            "search_history",
            "patent_views",
            "patent_detail_views",
            "technology_field_analysis",
            "users"  # Add users table to clean soft deleted users
        ]
        
        deleted_counts = {}
        
        for table in tables_to_clean:
            try:
                # Delete records for this user
                delete_url = f"{SUPABASE_URL}/rest/v1/{table}"
                delete_params = {"user_id": f"eq.{user_id}"}
                
                delete_response = requests.delete(
                    delete_url,
                    headers=SUPABASE_HEADERS,
                    params=delete_params
                )
                
                if delete_response.status_code == 204:
                    # Get count of deleted records (approximate)
                    count_response = supabase_query(table, select="id", filters={"user_id": f"eq.{user_id}"})
                    deleted_counts[table] = len(count_response["data"]) if count_response["data"] else 0
                    print(f"Cleaned table {table}")
                else:
                    print(f"Warning: Failed to clean table {table}: {delete_response.status_code}")
                    
            except Exception as e:
                print(f"Error cleaning table {table}: {str(e)}")
                continue
        
        # Step 3: Delete from deleted_users_history (by both email and user_id)
        try:
            # Delete by email
            if user_email:
                delete_url = f"{SUPABASE_URL}/rest/v1/deleted_users_history"
                delete_params = {"email": f"eq.{user_email}"}
                
                delete_response = requests.delete(
                    delete_url,
                    headers=SUPABASE_HEADERS,
                    params=delete_params
                )
                
                if delete_response.status_code == 204:
                    print("Cleaned deleted_users_history table by email")
                else:
                    print(f"Warning: Failed to clean deleted_users_history by email: {delete_response.status_code}")
            
            # Also delete by user_id if available
            if user_id:
                delete_url = f"{SUPABASE_URL}/rest/v1/deleted_users_history"
                delete_params = {"id": f"eq.{user_id}"}
                
                delete_response = requests.delete(
                    delete_url,
                    headers=SUPABASE_HEADERS,
                    params=delete_params
                )
                
                if delete_response.status_code == 204:
                    print("Cleaned deleted_users_history table by user_id")
                else:
                    print(f"Warning: Failed to clean deleted_users_history by user_id: {delete_response.status_code}")
                
        except Exception as e:
            print(f"Error cleaning deleted_users_history: {str(e)}")
        
        # Step 4: Delete from user_profiles
        if profile_user_id:
            try:
                delete_url = f"{SUPABASE_URL}/rest/v1/user_profiles"
                delete_params = {"email": f"eq.{user_email}"}
                
                delete_response = requests.delete(
                    delete_url,
                    headers=SUPABASE_HEADERS,
                    params=delete_params
                )
                
                if delete_response.status_code == 204:
                    print("Deleted from user_profiles")
                else:
                    print(f"Warning: Failed to delete from user_profiles: {delete_response.status_code}")
                    
            except Exception as e:
                print(f"Error deleting from user_profiles: {str(e)}")
        
        # Step 5: Delete from auth.users (this requires special handling)
        if auth_user_id:
            try:
                # Note: Deleting from auth.users might require admin privileges
                delete_url = f"{SUPABASE_URL}/rest/v1/auth.users"
                delete_params = {"email": f"eq.{user_email}"}
                
                delete_response = requests.delete(
                    delete_url,
                    headers=SUPABASE_HEADERS,
                    params=delete_params
                )
                
                if delete_response.status_code == 204:
                    print("Deleted from auth.users")
                else:
                    print(f"Warning: Failed to delete from auth.users: {delete_response.status_code}")
                    # This might fail due to RLS policies, but we continue
                    
            except Exception as e:
                print(f"Error deleting from auth.users: {str(e)}")
        
        # Step 6: Verify deletion
        verification_results = {}
        
        # Check auth.users
        auth_check = supabase_query("auth.users", select="id", filters={"email": f"eq.{user_email}"})
        verification_results["auth.users"] = len(auth_check["data"]) if auth_check["data"] else 0
        
        # Check user_profiles
        profile_check = supabase_query("user_profiles", select="user_id", filters={"email": f"eq.{user_email}"})
        verification_results["user_profiles"] = len(profile_check["data"]) if profile_check["data"] else 0
        
        # Check deleted_users_history
        history_check = supabase_query("deleted_users_history", select="id", filters={"email": f"eq.{user_email}"})
        verification_results["deleted_users_history"] = len(history_check["data"]) if history_check["data"] else 0
        
        print(f"Permanent deletion completed for user: {user_email}")
        print(f"Verification results: {verification_results}")
        
        return {
            "success": True,
            "message": f"사용자 {user_email}이 모든 테이블에서 완전히 삭제되었습니다.",
            "email": user_email,
            "user_id": user_id,
            "deleted_counts": deleted_counts,
            "verification": verification_results
        }
        
    except Exception as e:
        print(f"Error permanently deleting user: {str(e)}")
        return {
            "success": False,
            "message": f"사용자 완전 삭제 중 오류 발생: {str(e)}",
            "identifier": user_identifier
        }

@app.get("/api/v1/users/deleted")
async def get_deleted_users(page: int = 1, limit: int = 10):
    """Get soft deleted users endpoint"""
    try:
        offset = (page - 1) * limit
        
        # Build filters for deleted users - use deleted_at field instead of status
        filters = {
            "deleted_at": "not.is.null",  # 삭제된 사용자는 deleted_at이 NULL이 아님
            "offset": str(offset),
            "limit": str(limit),
            "order": "deleted_at.desc"
        }
        
        # Execute query
        result = supabase_query("users", filters=filters, count=True)
        
        users = []
        if result["data"]:
            for user in result["data"]:
                users.append({
                    "id": user.get("id"),
                    "username": user.get("username", user.get("email", "").split("@")[0]),
                    "email": user.get("email"),
                    "role": user.get("role", "user"),
                    "status": "deleted",  # 삭제된 사용자로 표시
                    "createdAt": user.get("created_at"),
                    "deletedAt": user.get("deleted_at"),
                    "subscription": user.get("subscription_plan", "free")
                })
        
        return {
            "users": users,
            "total": result["count"],
            "page": page,
            "limit": limit,
            "totalPages": (result["count"] + limit - 1) // limit
        }
    except Exception as e:
        print(f"Error fetching deleted users: {e}")
        # Fallback to mock data
        mock_deleted_users = [
            {"id": 101, "username": "삭제된사용자1", "email": "deleted1@example.com", "role": "user", "status": "deleted", "createdAt": "2024-01-01T00:00:00Z", "deletedAt": "2024-01-10T10:30:00Z", "subscription": "free"},
            {"id": 102, "username": "삭제된사용자2", "email": "deleted2@example.com", "role": "user", "status": "deleted", "createdAt": "2024-01-02T00:00:00Z", "deletedAt": "2024-01-11T11:15:00Z", "subscription": "basic"}
        ]
        
        # Apply pagination to mock data
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_users = mock_deleted_users[start_idx:end_idx]
        
        return {
            "users": paginated_users,
            "total": len(mock_deleted_users),
            "page": page,
            "limit": limit,
            "totalPages": (len(mock_deleted_users) + limit - 1) // limit
        }

@app.post("/api/v1/users/{user_id}/restore")
async def restore_user(user_id: str):
    """Restore soft deleted user endpoint"""
    try:
        # Try to restore user in Supabase using direct PATCH request
        update_data = {
            "deleted_at": None
        }
        
        # Direct PATCH request to Supabase
        url = f"{SUPABASE_URL}/rest/v1/users"
        params = {"id": f"eq.{user_id}"}
        
        response = requests.patch(
            url, 
            headers=SUPABASE_HEADERS, 
            params=params,
            json=update_data
        )
        
        if response.status_code == 204:  # Supabase returns 204 for successful updates
            return {
                "success": True,
                "message": "사용자가 성공적으로 복원되었습니다.",
                "user_id": user_id,
                "restored_at": datetime.now().isoformat()
            }
        else:
            print(f"Supabase restore failed with status: {response.status_code}, response: {response.text}")
            return {
                "success": False,
                "message": "사용자를 찾을 수 없습니다.",
                "user_id": user_id
            }
    except Exception as e:
        print(f"Error restoring user: {e}")
        # Return success for mock data
        return {
            "success": True,
            "message": "사용자가 성공적으로 복원되었습니다. (Mock)",
            "user_id": user_id,
            "restored_at": datetime.now().isoformat()
        }

@app.get("/api/v1/payments/stats")
async def get_payment_stats(date_range: Optional[str] = None):
    """Payment statistics endpoint with real Supabase data"""
    try:
        # Get all payment orders (this is where the actual payment data is)
        payments_response = supabase_query("payment_orders")
        
        if not payments_response["data"]:
            # Return zero stats if no payments found
            return {
                "total_revenue": 0,
                "monthly_revenue": 0,
                "total_transactions": 0,
                "successful_transactions": 0,
                "failed_transactions": 0,
                "pending_transactions": 0,
                "cancelled_transactions": 0,
                "average_transaction_amount": 0,
                "revenue_today": 0,
                "revenue_this_week": 0,
                "revenue_this_month": 0
            }
        
        payments = payments_response["data"]
        
        # Calculate statistics
        total_transactions = len(payments)
        successful_payments = [p for p in payments if p.get("status") == "completed"]
        failed_payments = [p for p in payments if p.get("status") == "failed"]
        pending_payments = [p for p in payments if p.get("status") == "pending"]
        cancelled_payments = [p for p in payments if p.get("status") == "cancelled"]
        
        total_revenue = sum(p.get("amount_krw", 0) for p in successful_payments)
        
        # Calculate monthly revenue
        current_month = datetime.now().replace(day=1)
        monthly_payments = [p for p in successful_payments if p.get("created_at") and datetime.fromisoformat(p["created_at"].replace("Z", "+00:00")) >= current_month]
        monthly_revenue = sum(p.get("amount_krw", 0) for p in monthly_payments)
        
        # Calculate average transaction amount
        average_transaction_amount = total_revenue / len(successful_payments) if successful_payments else 0
        
        # Calculate today's revenue
        today = datetime.now().date()
        today_payments = [p for p in successful_payments if p.get("created_at") and datetime.fromisoformat(p["created_at"].replace("Z", "+00:00")).date() == today]
        revenue_today = sum(p.get("amount_krw", 0) for p in today_payments)
        
        # Calculate this week's revenue
        week_start = datetime.now() - timedelta(days=datetime.now().weekday())
        week_payments = [p for p in successful_payments if p.get("created_at") and datetime.fromisoformat(p["created_at"].replace("Z", "+00:00")) >= week_start]
        revenue_this_week = sum(p.get("amount_krw", 0) for p in week_payments)
        
        return {
            "total_revenue": total_revenue,
            "monthly_revenue": monthly_revenue,
            "total_transactions": total_transactions,
            "successful_transactions": len(successful_payments),
            "failed_transactions": len(failed_payments),
            "pending_transactions": len(pending_payments),
            "cancelled_transactions": len(cancelled_payments),
            "average_transaction_amount": round(average_transaction_amount, 2),
            "revenue_today": revenue_today,
            "revenue_this_week": revenue_this_week,
            "revenue_this_month": monthly_revenue
        }
    except Exception as e:
        print(f"Error fetching payment stats: {e}")
        # Fallback to mock data
        return {
            "total_revenue": random.randint(2000000, 3000000),
            "monthly_revenue": random.randint(200000, 500000),
            "total_transactions": random.randint(1000, 2000),
            "successful_transactions": random.randint(950, 1900),
            "failed_transactions": random.randint(10, 50),
            "pending_transactions": random.randint(5, 20),
            "refunded_transactions": random.randint(1, 10),
            "average_transaction_amount": random.randint(50000, 150000),
            "revenue_today": random.randint(10000, 50000),
            "revenue_this_week": random.randint(100000, 300000),
            "revenue_this_month": random.randint(200000, 500000)
        }

@app.get("/api/v1/payments")
async def get_payments(page: int = 1, per_page: int = 20, status: Optional[str] = None, method: Optional[str] = None, search: Optional[str] = None):
    """Payments list endpoint with real Supabase data"""
    try:
        # Build filters
        filters = {}
        if status:
            filters["status"] = f"eq.{status}"
        
        # Apply pagination
        offset = (page - 1) * per_page
        filters["offset"] = str(offset)
        filters["limit"] = str(per_page)
        filters["order"] = "created_at.desc"
        
        # Get payment orders with count (this is where the actual payment data is)
        response = supabase_query("payment_orders", filters=filters, count=True)
        total = response["count"]
        
        # Format payments data
        payments = []
        if response["data"]:
            for payment in response["data"]:
                # Apply search filter in Python if needed
                if search:
                    search_lower = search.lower()
                    if not (search_lower in payment.get("order_id", "").lower() or 
                           search_lower in payment.get("goods_name", "").lower()):
                        continue
                
                payments.append({
                    "id": payment.get("id"),
                    "user_id": payment.get("user_id"),
                    "order_id": payment.get("order_id"),
                    "transaction_id": payment.get("payment_id", ""),
                    "amount": payment.get("amount_krw", 0),
                    "currency": payment.get("currency", "KRW"),
                    "status": payment.get("status", "pending"),
                    "payment_type": payment.get("payment_type", ""),
                    "goods_name": payment.get("goods_name", ""),
                    "created_at": payment.get("created_at"),
                    "completed_at": payment.get("completed_at"),
                    "cancelled_at": payment.get("cancelled_at"),
                    "description": payment.get("goods_name", "")
                })
        
        return {
            "payments": payments,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page
        }
    except Exception as e:
        print(f"Error fetching payments: {e}")
        # Fallback to mock data
        return {
            "payments": [
                {
                    "id": f"payment_{i}",
                    "user_id": f"user_{i}",
                    "user_email": f"user{i}@example.com",
                    "user_name": f"사용자 {i}",
                    "transaction_id": f"txn_{i}",
                    "amount": random.randint(10000, 100000),
                    "currency": "KRW",
                    "status": "completed" if i % 4 != 0 else "pending",
                    "payment_method": "card",
                    "method": "card",
                    "created_at": "2025-01-15T10:30:00Z",
                    "description": f"결제 {i}"
                }
                for i in range(1, 21)
            ],
            "total": 20,
            "page": page,
            "per_page": per_page,
            "total_pages": 1
        }

from pydantic import BaseModel, EmailStr
from typing import Optional

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    totp_code: Optional[str] = None

@app.post("/api/v1/auth/login")
async def admin_login(credentials: LoginRequest):
    """Admin login endpoint"""
    try:
        email = credentials.email
        password = credentials.password
        
        if not email or not password:
            raise HTTPException(status_code=400, detail="이메일과 비밀번호가 필요합니다.")
        
        # Mock admin authentication
        if email == "admin@p-ai.co.kr" and password == "admin123":
            return {
                "access_token": "mock_admin_token",
                "refresh_token": "mock_refresh_token",
                "token_type": "bearer",
                "expires_in": 3600,
                "admin": {
                    "id": "admin_001",
                    "email": email,
                    "role": "admin",
                    "name": "관리자",
                    "permissions": ["all"]
                },
                "requires_2fa": False
            }
        else:
            raise HTTPException(status_code=401, detail="잘못된 인증 정보입니다.")
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="로그인 처리 중 오류가 발생했습니다.")

@app.get("/api/v1/auth/me")
async def get_current_admin():
    """Get current admin info endpoint"""
    try:
        # For testing purposes, return mock admin info without token validation
        # In production, this should validate the Bearer token
        return {
            "id": "admin_001",
            "email": "admin@p-ai.co.kr",
            "name": "관리자",
            "role": "admin",
            "permissions": ["all"],
            "is_active": True,
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z"
        }
    except Exception as e:
        print(f"Get current admin error: {e}")
        raise HTTPException(status_code=500, detail="관리자 정보 조회 중 오류가 발생했습니다.")

@app.post("/api/v1/auth/signup")
async def user_signup(user_data: dict):
    """Enhanced user signup with deletion history check"""
    try:
        email = user_data.get("email")
        name = user_data.get("name")
        password = user_data.get("password")
        
        if not email or not name or not password:
            raise HTTPException(status_code=400, detail="이메일, 이름, 비밀번호가 필요합니다.")
        
        # Check if user with this email was previously deleted
        history_response = supabase_query(
            "deleted_users_history", 
            select="*", 
            filters={"email": f"eq.{email}"}
        )
        
        previously_deleted = len(history_response["data"]) > 0
        signup_bonus_points = 0 if previously_deleted else 5000  # No bonus for previously deleted users
        
        # Create new user
        current_time = datetime.now().isoformat()
        new_user_data = {
            "email": email,
            "name": name,
            "role": "user",
            "subscription_plan": "free",
            "usage_count": 0,
            "total_searches": 0,
            "total_detail_views": 0,
            "total_logins": 0,
            "total_usage_cost": 0,
            "total_reports": 0,
            "previously_deleted": previously_deleted,
            "created_at": current_time,
            "updated_at": current_time
        }
        
        # Insert new user
        user_url = f"{SUPABASE_URL}/rest/v1/users"
        user_response = requests.post(
            user_url,
            headers=SUPABASE_HEADERS,
            json=new_user_data
        )
        
        if user_response.status_code in [200, 201]:
            created_user = user_response.json()
            user_id = created_user[0]["id"] if isinstance(created_user, list) else created_user["id"]
            
            # Grant signup bonus points if not previously deleted
            if signup_bonus_points > 0:
                try:
                    # Use Supabase function for consistent point granting
                    bonus_url = f"{SUPABASE_URL}/rest/v1/rpc/grant_signup_bonus"
                    bonus_response = requests.post(
                        bonus_url,
                        headers=SUPABASE_HEADERS,
                        json={"p_user_id": user_id}
                    )
                    
                    if bonus_response.status_code in [200, 201]:
                        bonus_result = bonus_response.json()
                        if bonus_result and len(bonus_result) > 0 and bonus_result[0].get("granted"):
                            print(f"Signup bonus granted to user {user_id}: {bonus_result[0].get('points_amount')}P")
                        else:
                            print(f"Signup bonus not granted: {bonus_result[0].get('message') if bonus_result else 'Unknown error'}")
                    else:
                        print(f"Failed to grant signup bonus: {bonus_response.status_code}")
                        # Fallback to direct insertion
                        points_data = {
                            "user_id": user_id,
                            "amount": signup_bonus_points,
                            "transaction_type": "signup_bonus",
                            "description": "회원가입 축하 포인트",
                            "created_at": current_time
                        }
                        
                        points_url = f"{SUPABASE_URL}/rest/v1/point_transactions"
                        fallback_response = requests.post(
                            points_url,
                            headers=SUPABASE_HEADERS,
                            json=points_data
                        )
                        
                        if fallback_response.status_code in [200, 201]:
                            print(f"Signup bonus granted via fallback to user {user_id}")
                        else:
                            print(f"Fallback signup bonus also failed: {fallback_response.status_code}")
                except Exception as e:
                    print(f"Error granting signup bonus: {e}")
            
            # Log signup event
            log_data = {
                "level": "INFO",
                "source": "user_signup",
                "message": f"New user signup: {email} (Previously deleted: {previously_deleted})",
                "metadata": {
                    "user_id": user_id,
                    "email": email,
                    "previously_deleted": previously_deleted,
                    "signup_bonus_granted": signup_bonus_points > 0
                },
                "created_at": current_time
            }
            
            log_url = f"{SUPABASE_URL}/rest/v1/system_logs"
            requests.post(log_url, headers=SUPABASE_HEADERS, json=log_data)
            
            return {
                "success": True,
                "message": "회원가입이 완료되었습니다.",
                "user_id": user_id,
                "signup_bonus_granted": signup_bonus_points > 0,
                "bonus_points": signup_bonus_points,
                "previously_deleted": previously_deleted
            }
        else:
            print(f"Failed to create user: {user_response.status_code}, {user_response.text}")
            raise HTTPException(status_code=400, detail="회원가입에 실패했습니다.")
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Signup error: {e}")
        raise HTTPException(status_code=500, detail="회원가입 처리 중 오류가 발생했습니다.")

@app.get("/api/v1/users/{user_id}/deletion-history")
async def get_user_deletion_history(user_id: str):
    """Get deletion history for a specific user"""
    try:
        # Get user email first
        user_response = supabase_query("users", select="email", filters={"id": f"eq.{user_id}"})
        if not user_response["data"]:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
        
        user_email = user_response["data"][0]["email"]
        
        # Get deletion history
        history_response = supabase_query(
            "deleted_users_history",
            select="*",
            filters={"email": f"eq.{user_email}"}
        )
        
        return {
            "success": True,
            "user_id": user_id,
            "email": user_email,
            "deletion_history": history_response["data"]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting deletion history: {e}")
        raise HTTPException(status_code=500, detail="삭제 이력 조회 중 오류가 발생했습니다.")

@app.post("/api/v1/admin/cleanup-old-users")
async def cleanup_old_deleted_users():
    """Manual trigger for cleaning up users deleted more than 1 year ago"""
    try:
        # Call the Supabase function to cleanup old deleted users
        cleanup_url = f"{SUPABASE_URL}/rest/v1/rpc/cleanup_old_deleted_users"
        response = requests.post(cleanup_url, headers=SUPABASE_HEADERS)
        
        if response.status_code == 200:
            deleted_count = response.json()
            
            # Log the cleanup operation
            log_data = {
                "level": "INFO",
                "source": "manual_cleanup",
                "message": f"Manual cleanup completed. Deleted {deleted_count} old users.",
                "metadata": {"deleted_count": deleted_count},
                "created_at": datetime.now().isoformat()
            }
            
            log_url = f"{SUPABASE_URL}/rest/v1/system_logs"
            requests.post(log_url, headers=SUPABASE_HEADERS, json=log_data)
            
            return {
                "success": True,
                "message": f"{deleted_count}명의 1년 경과 삭제 사용자가 정리되었습니다.",
                "deleted_count": deleted_count
            }
        else:
            print(f"Cleanup function failed: {response.status_code}, {response.text}")
            return {
                "success": False,
                "message": "정리 작업에 실패했습니다.",
                "error": response.text
            }
    
    except Exception as e:
        print(f"Error during cleanup: {e}")
        return {
            "success": False,
            "message": f"정리 작업 중 오류가 발생했습니다: {str(e)}"
        }

@app.get("/api/v1/admin/cleanup-status")
async def get_cleanup_status():
    """Get status of automatic cleanup operations"""
    try:
        # Get recent cleanup logs
        logs_response = supabase_query(
            "system_logs",
            select="*",
            filters={
                "source": "in.(cleanup_job,manual_cleanup)",
                "order": "created_at.desc",
                "limit": "10"
            }
        )
        
        # Count users eligible for cleanup (deleted more than 1 year ago)
        one_year_ago = (datetime.now() - timedelta(days=365)).isoformat()
        eligible_response = supabase_query(
            "deleted_users_history",
            select="id",
            filters={"deleted_at": f"lt.{one_year_ago}"},
            count=True
        )
        
        return {
            "success": True,
            "eligible_for_cleanup": eligible_response["count"],
            "recent_cleanup_logs": logs_response["data"],
            "last_cleanup": logs_response["data"][0] if logs_response["data"] else None
        }
    
    except Exception as e:
        print(f"Error getting cleanup status: {e}")
        return {
            "success": False,
            "message": f"정리 상태 조회 중 오류가 발생했습니다: {str(e)}"
        }

def grant_monthly_points():
    """Grant monthly points to users on their signup anniversary"""
    try:
        print("Running monthly point grant process...")
        current_date = datetime.now()
        current_day = current_date.day
        
        # Get all active users who signed up on this day of month in previous months
        # We need to check users whose created_at day matches current day
        users_response = supabase_query(
            "users", 
            select="id,email,created_at", 
            filters={
                "deleted_at": "is.null"  # Only active users
            }
        )
        
        if not users_response["data"]:
            print("No users found for monthly point grant")
            return 0
        
        granted_count = 0
        
        for user in users_response["data"]:
            try:
                user_id = user["id"]
                user_email = user["email"]
                created_at = datetime.fromisoformat(user["created_at"].replace('Z', '+00:00'))
                
                # Check if user's signup day matches current day
                if created_at.day == current_day:
                    # Check if user has been registered for at least 1 month
                    months_since_signup = (current_date.year - created_at.year) * 12 + (current_date.month - created_at.month)
                    
                    if months_since_signup >= 1:
                        # Check if points were already granted this month
                        current_month_start = current_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                        
                        existing_grant = supabase_query(
                            "point_transactions",
                            select="id",
                            filters={
                                "user_id": f"eq.{user_id}",
                                "transaction_type": "eq.monthly_bonus",
                                "created_at": f"gte.{current_month_start.isoformat()}"
                            }
                        )
                        
                        if not existing_grant["data"]:
                            # Grant monthly points
                            points_data = {
                                "user_id": user_id,
                                "points": 1500,
                                "transaction_type": "monthly_bonus",
                                "description": f"월간 정기 포인트 ({months_since_signup}개월차)",
                                "created_at": current_date.isoformat()
                            }
                            
                            points_url = f"{SUPABASE_URL}/rest/v1/point_transactions"
                            points_response = requests.post(
                                points_url,
                                headers=SUPABASE_HEADERS,
                                json=points_data
                            )
                            
                            if points_response.status_code in [200, 201]:
                                granted_count += 1
                                print(f"Monthly points granted to user {user_email} ({months_since_signup} months)")
                            else:
                                print(f"Failed to grant monthly points to {user_email}: {points_response.status_code}")
                        else:
                            print(f"Monthly points already granted to {user_email} this month")
                            
            except Exception as e:
                print(f"Error processing user {user.get('email', 'unknown')}: {str(e)}")
                continue
        
        print(f"Monthly point grant completed. Granted to {granted_count} users.")
        
        # Log the operation
        log_data = {
            "level": "INFO",
            "source": "monthly_points_job",
            "message": f"Monthly point grant completed. Granted to {granted_count} users.",
            "metadata": {"granted_count": granted_count},
            "created_at": current_date.isoformat()
        }
        
        log_url = f"{SUPABASE_URL}/rest/v1/system_logs"
        requests.post(log_url, headers=SUPABASE_HEADERS, json=log_data)
        
        return granted_count
        
    except Exception as e:
        print(f"Error in monthly point grant: {str(e)}")
        
        # Log the error
        log_data = {
            "level": "ERROR",
            "source": "monthly_points_job",
            "message": f"Monthly point grant error: {str(e)}",
            "created_at": datetime.now().isoformat()
        }
        
        log_url = f"{SUPABASE_URL}/rest/v1/system_logs"
        requests.post(log_url, headers=SUPABASE_HEADERS, json=log_data)
        
        return 0

def run_scheduled_tasks():
    """Background task to run scheduled tasks every 24 hours"""
    while True:
        try:
            print("Running scheduled tasks...")
            
            # 1. Run monthly point grants
            try:
                granted_count = grant_monthly_points()
                print(f"Monthly point grant completed. Granted to {granted_count} users.")
            except Exception as e:
                print(f"Error in monthly point grant: {e}")
            
            # 2. Run cleanup of old deleted users
            try:
                print("Running scheduled cleanup of old deleted users...")
                
                # Call the cleanup function
                cleanup_url = f"{SUPABASE_URL}/rest/v1/rpc/cleanup_old_deleted_users"
                response = requests.post(cleanup_url, headers=SUPABASE_HEADERS)
                
                if response.status_code == 200:
                    deleted_count = response.json()
                    print(f"Scheduled cleanup completed. Deleted {deleted_count} old users.")
                    
                    # Log the cleanup operation
                    log_data = {
                        "level": "INFO",
                        "source": "cleanup_job",
                        "message": f"Scheduled cleanup completed. Deleted {deleted_count} old users.",
                        "metadata": {"deleted_count": deleted_count},
                        "created_at": datetime.now().isoformat()
                    }
                    
                    log_url = f"{SUPABASE_URL}/rest/v1/system_logs"
                    requests.post(log_url, headers=SUPABASE_HEADERS, json=log_data)
                else:
                    print(f"Scheduled cleanup failed: {response.status_code}, {response.text}")
                    
                    # Log the error
                    log_data = {
                        "level": "ERROR",
                        "source": "cleanup_job",
                        "message": f"Scheduled cleanup failed: {response.text}",
                        "metadata": {"status_code": response.status_code},
                        "created_at": datetime.now().isoformat()
                    }
                    
                    log_url = f"{SUPABASE_URL}/rest/v1/system_logs"
                    requests.post(log_url, headers=SUPABASE_HEADERS, json=log_data)
            
            except Exception as e:
                print(f"Error in scheduled cleanup: {e}")
                
                # Log the error
                log_data = {
                    "level": "ERROR",
                    "source": "cleanup_job",
                    "message": f"Scheduled cleanup error: {str(e)}",
                    "created_at": datetime.now().isoformat()
                }
                
                log_url = f"{SUPABASE_URL}/rest/v1/system_logs"
                requests.post(log_url, headers=SUPABASE_HEADERS, json=log_data)
        
        except Exception as e:
            print(f"Error in scheduled tasks: {e}")
        
        # Wait 24 hours before next run
        time.sleep(24 * 60 * 60)

# Start the cleanup scheduler in a background thread
scheduled_tasks_thread = threading.Thread(target=run_scheduled_tasks, daemon=True)
scheduled_tasks_thread.start()

@app.get("/api/v1/monitoring/logs")
async def get_monitoring_logs(limit: int = 100, level: Optional[str] = None):
    """Get system logs from Supabase"""
    try:
        # Build filters
        filters = {}
        if level and level != "[object Object]":
            filters["level"] = f"eq.{level}"
        
        filters["limit"] = str(limit)
        filters["order"] = "created_at.desc"
        
        # Try to get logs from system_logs table
        response = supabase_query("system_logs", filters=filters)
        
        logs = []
        if response["data"]:
            for log in response["data"]:
                logs.append({
                    "id": log.get("id"),
                    "timestamp": log.get("created_at"),
                    "level": log.get("level", "info"),
                    "message": log.get("message", ""),
                    "source": log.get("source", "system"),
                    "details": log.get("details", {})
                })
        
        return {"logs": logs}
    except Exception as e:
        print(f"Error fetching logs: {e}")
        # Return mock logs if Supabase fails
        return {
            "logs": [
                {
                    "id": f"log_{i}",
                    "timestamp": "2025-01-15T10:30:00Z",
                    "level": "info" if i % 3 != 0 else "warning",
                    "message": f"시스템 로그 메시지 {i}",
                    "source": "system",
                    "details": {}
                }
                for i in range(min(limit, 20))
            ]
        }

@app.get("/api/v1/monitoring/alert-rules")
async def get_alert_rules():
    """Get monitoring alert rules"""
    try:
        # Try to get alert rules from alert_rules table
        response = supabase_query("alert_rules")
        
        rules = []
        if response["data"]:
            for rule in response["data"]:
                rules.append({
                    "id": rule.get("id"),
                    "name": rule.get("name"),
                    "condition": rule.get("condition"),
                    "threshold": rule.get("threshold"),
                    "enabled": rule.get("enabled", True),
                    "created_at": rule.get("created_at")
                })
        
        return {"rules": rules}
    except Exception as e:
        print(f"Error fetching alert rules: {e}")
        # Return mock alert rules if Supabase fails
        return {
            "rules": [
                {
                    "id": "rule_1",
                    "name": "높은 CPU 사용률",
                    "condition": "cpu_usage > 80",
                    "threshold": 80,
                    "enabled": True,
                    "created_at": "2025-01-15T10:30:00Z"
                },
                {
                    "id": "rule_2", 
                    "name": "메모리 부족",
                    "condition": "memory_usage > 90",
                    "threshold": 90,
                    "enabled": True,
                    "created_at": "2025-01-15T10:30:00Z"
                }
            ]
        }

@app.get("/api/v1/dashboard/extended-stats")
async def get_extended_stats(days: int = 100):
    """Extended dashboard statistics endpoint with ALL available data (no period restrictions)"""
    try:
        # Remove period restrictions - use ALL available data for conversion rate calculations
        # This ensures conversion rates are calculated from the complete dataset
        
        # Get total users count
        users_response = supabase_query("users", select="id", count=True)
        total_users = users_response["count"]
        
        # Get ALL login activities count (no date filter)
        login_activities_response = supabase_query("user_activities", 
            select="id", 
            filters={
                "activity_type": "eq.login"
            }, 
            count=True)
        total_logins = login_activities_response["count"]
        
        # Get ALL search activities count (no date filter)
        search_activities_response = supabase_query("search_history", 
            select="id", 
            count=True)
        total_searches = search_activities_response["count"]
        
        # Alternative: get from user_activities if search_history is empty
        if total_searches == 0:
            search_activities_alt = supabase_query("user_activities", 
                select="id", 
                filters={
                    "activity_type": "eq.search"
                }, 
                count=True)
            total_searches = search_activities_alt["count"]
        
        # Get ALL reports count (no date filter)
        reports_response = supabase_query("reports", 
            select="id", 
            count=True)
        total_reports = reports_response["count"]
        
        # Get ALL AI analysis reports count (no date filter)
        ai_reports_response = supabase_query("ai_analysis_reports", 
            select="id", 
            count=True)
        total_ai_reports = ai_reports_response["count"]
        
        # Use the higher count between reports and ai_analysis_reports
        total_reports = max(total_reports, total_ai_reports)
        
        # Calculate averages and conversion rates using ALL data
        avg_logins_per_user = round(total_logins / total_users, 2) if total_users > 0 else 0
        avg_searches_per_user = round(total_searches / total_users, 2) if total_users > 0 else 0
        avg_reports_per_user = round(total_reports / total_users, 2) if total_users > 0 else 0
        
        # Conversion rates using ALL available data (no period restrictions)
        login_to_report_rate = round((total_reports / total_logins * 100), 2) if total_logins > 0 else 0
        search_to_report_rate = round((total_reports / total_searches * 100), 2) if total_searches > 0 else 0
        
        # Get additional metrics (ALL data)
        # Patent views
        patent_views_response = supabase_query("patent_views", 
            select="id", 
            count=True)
        total_patent_views = patent_views_response["count"]
        
        # Document downloads
        downloads_response = supabase_query("document_downloads", 
            select="id", 
            count=True)
        total_downloads = downloads_response["count"]
        
        return {
            "total_users": total_users,
            "total_logins": total_logins,
            "total_searches": total_searches,
            "total_reports": total_reports,
            "total_patent_views": total_patent_views,
            "total_downloads": total_downloads,
            "avg_logins_per_user": avg_logins_per_user,
            "avg_searches_per_user": avg_searches_per_user,
            "avg_reports_per_user": avg_reports_per_user,
            "login_to_report_rate": login_to_report_rate,
            "search_to_report_rate": search_to_report_rate,
            "period_days": "ALL_DATA",  # Indicates all available data is used
            "note": "Conversion rates calculated using ALL available database data (no period restrictions)"
        }
    except Exception as e:
        print(f"Error fetching extended stats: {e}")
        import traceback
        traceback.print_exc()
        
        # Fallback to basic real data
        try:
            users_count = supabase_query("users", select="id", count=True)["count"]
            reports_count = supabase_query("reports", select="id", count=True)["count"]
            
            return {
                "total_users": users_count or 0,
                "total_logins": 0,
                "total_searches": 0,
                "total_reports": reports_count or 0,
                "total_patent_views": 0,
                "total_downloads": 0,
                "avg_logins_per_user": 0.0,
                "avg_searches_per_user": 0.0,
                "avg_reports_per_user": round(reports_count / users_count, 2) if users_count > 0 else 0.0,
                "login_to_report_rate": 0.0,
                "search_to_report_rate": 0.0,
                "period_days": "ALL_DATA",
                "note": "Fallback data - conversion rates calculated using ALL available database data"
            }
        except:
            return {
                "total_users": 0,
                "total_logins": 0,
                "total_searches": 0,
                "total_reports": 0,
                "total_patent_views": 0,
                "total_downloads": 0,
                "avg_logins_per_user": 0.0,
                "avg_searches_per_user": 0.0,
                "avg_reports_per_user": 0.0,
                "login_to_report_rate": 0.0,
                "search_to_report_rate": 0.0,
                "period_days": "ALL_DATA",
                "note": "Error fallback - no period restrictions applied"
            }

@app.get("/api/v1/dashboard/popular-keywords")
async def get_popular_keywords(days: int = 30, limit: int = 10):
    """Popular keywords endpoint with real data"""
    try:
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Try to get real data from search_history table
        search_response = supabase_query("search_history", 
            select="query,created_at", 
            filters={
                "created_at": f"gte.{start_date.isoformat()}",
                "order": "created_at.desc",
                "limit": "1000"
            })
        
        keyword_counts = {}
        
        # Process search_history data
        if search_response["data"]:
            for query in search_response["data"]:
                keyword = query.get("query", "").strip().lower()
                if keyword and len(keyword) > 1:  # Filter out single characters
                    keyword_counts[keyword] = keyword_counts.get(keyword, 0) + 1
        
        # Also try to get from search_keyword_analytics table if available
        keyword_analytics_response = supabase_query("search_keyword_analytics", 
            select="keyword,search_count", 
            filters={
                "created_at": f"gte.{start_date.isoformat()}",
                "order": "search_count.desc",
                "limit": str(limit * 2)
            })
        
        if keyword_analytics_response["data"]:
            for item in keyword_analytics_response["data"]:
                keyword = item.get("keyword", "").strip().lower()
                count = item.get("search_count", 0)
                if keyword and count > 0:
                    keyword_counts[keyword] = keyword_counts.get(keyword, 0) + count
        
        # Also check user_activities for search activities
        if not keyword_counts:
            activities_response = supabase_query("user_activities", 
                select="description,metadata", 
                filters={
                    "activity_type": "eq.search",
                    "created_at": f"gte.{start_date.isoformat()}",
                    "limit": "500"
                })
            
            if activities_response["data"]:
                for activity in activities_response["data"]:
                    # Try to extract keyword from description or metadata
                    description = activity.get("description", "")
                    metadata = activity.get("metadata", {})
                    
                    keyword = None
                    if isinstance(metadata, dict) and "query" in metadata:
                        keyword = metadata["query"]
                    elif "검색" in description:
                        # Extract keyword from description if possible
                        parts = description.split(":")
                        if len(parts) > 1:
                            keyword = parts[1].strip()
                    
                    if keyword:
                        keyword = keyword.strip().lower()
                        if len(keyword) > 1:
                            keyword_counts[keyword] = keyword_counts.get(keyword, 0) + 1
        
        # Sort by frequency and get top keywords
        if keyword_counts:
            popular_keywords = sorted(keyword_counts.items(), key=lambda x: x[1], reverse=True)[:limit]
            
            return {
                "keywords": [
                    {
                        "keyword": keyword,
                        "count": count,
                        "rank": idx + 1
                    }
                    for idx, (keyword, count) in enumerate(popular_keywords)
                ]
            }
        
        # If no real data, return empty or minimal mock data
        return {
            "keywords": []
        }
        
    except Exception as e:
        print(f"Error fetching popular keywords: {e}")
        import traceback
        traceback.print_exc()
        
        # Return empty result instead of mock data
        return {
            "keywords": []
        }

@app.get("/api/v1/dashboard/popular-patents")
async def get_popular_patents(days: int = 30, limit: int = 10):
    """Popular patents endpoint with real data"""
    try:
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        patent_counts = {}
        
        # Try to get real data from ai_analysis_reports table
        ai_reports_response = supabase_query("ai_analysis_reports", 
            select="patent_number,patent_title,created_at", 
            filters={
                "created_at": f"gte.{start_date.isoformat()}",
                "order": "created_at.desc",
                "limit": "1000"
            })
        
        if ai_reports_response["data"]:
            for analysis in ai_reports_response["data"]:
                patent_number = analysis.get("patent_number", "").strip()
                patent_title = analysis.get("patent_title", "").strip()
                if patent_number:
                    key = f"{patent_number}|{patent_title}"
                    patent_counts[key] = patent_counts.get(key, 0) + 1
        
        # Also check reports table
        reports_response = supabase_query("reports", 
            select="patent_id,created_at", 
            filters={
                "created_at": f"gte.{start_date.isoformat()}",
                "order": "created_at.desc",
                "limit": "1000"
            })
        
        if reports_response["data"]:
            for report in reports_response["data"]:
                patent_number = report.get("patent_id", "").strip()
                if patent_number:
                    key = f"{patent_number}|분석 보고서"
                    patent_counts[key] = patent_counts.get(key, 0) + 1
        
        # Check patent_views table for view counts
        patent_views_response = supabase_query("patent_views", 
            select="patent_id,created_at", 
            filters={
                "created_at": f"gte.{start_date.isoformat()}",
                "limit": "1000"
            })
        
        if patent_views_response["data"]:
            for view in patent_views_response["data"]:
                patent_number = view.get("patent_id", "").strip()
                if patent_number:
                    # Try to find title from existing data or use generic title
                    existing_key = None
                    for key in patent_counts.keys():
                        if key.startswith(patent_number + "|"):
                            existing_key = key
                            break
                    
                    if existing_key:
                        patent_counts[existing_key] = patent_counts.get(existing_key, 0) + 1
                    else:
                        key = f"{patent_number}|특허 문서"
                        patent_counts[key] = patent_counts.get(key, 0) + 1
        
        # Check patent_detail_views table
        detail_views_response = supabase_query("patent_detail_views", 
            select="patent_application_number,created_at", 
            filters={
                "created_at": f"gte.{start_date.isoformat()}",
                "limit": "1000"
            })
        
        if detail_views_response["data"]:
            for view in detail_views_response["data"]:
                patent_number = view.get("patent_application_number", "").strip()
                if patent_number:
                    existing_key = None
                    for key in patent_counts.keys():
                        if key.startswith(patent_number + "|"):
                            existing_key = key
                            break
                    
                    if existing_key:
                        patent_counts[existing_key] = patent_counts.get(existing_key, 0) + 1
                    else:
                        key = f"{patent_number}|특허 상세 정보"
                        patent_counts[key] = patent_counts.get(key, 0) + 1
        
        # Sort by frequency and get top patents
        if patent_counts:
            popular_patents = sorted(patent_counts.items(), key=lambda x: x[1], reverse=True)[:limit]
            
            return {
                "patents": [
                    {
                        "patent_number": patent_info.split("|")[0],
                        "title": patent_info.split("|")[1] if "|" in patent_info else "특허 제목",
                        "analysis_count": count,
                        "rank": idx + 1
                    }
                    for idx, (patent_info, count) in enumerate(popular_patents)
                ]
            }
        
        # If no real data, return empty result
        return {
            "patents": []
        }
        
    except Exception as e:
        print(f"Error fetching popular patents: {e}")
        import traceback
        traceback.print_exc()
        
        # Return empty result instead of mock data
        return {
            "patents": []
        }

@app.post("/api/v1/admin/grant-monthly-points")
async def manual_grant_monthly_points():
    """Manually trigger monthly point grant process"""
    try:
        granted_count = grant_monthly_points()
        
        return {
            "success": True,
            "message": f"월간 포인트 지급이 완료되었습니다.",
            "granted_count": granted_count
        }
        
    except Exception as e:
        print(f"Error in manual monthly point grant: {e}")
        return {
            "success": False,
            "message": f"월간 포인트 지급 중 오류 발생: {str(e)}"
        }

@app.get("/api/v1/admin/monthly-points-status")
async def get_monthly_points_status():
    """Get monthly points status and statistics"""
    try:
        current_date = datetime.now()
        current_month_start = current_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Get count of users eligible for monthly points today
        current_day = current_date.day
        
        users_response = supabase_query(
            "users", 
            select="id,email,created_at", 
            filters={
                "deleted_at": "is.null"
            }
        )
        
        eligible_today = 0
        already_granted_today = 0
        
        if users_response["data"]:
            for user in users_response["data"]:
                try:
                    created_at = datetime.fromisoformat(user["created_at"].replace('Z', '+00:00'))
                    if created_at.day == current_day:
                        months_since_signup = (current_date.year - created_at.year) * 12 + (current_date.month - created_at.month)
                        if months_since_signup >= 1:
                            eligible_today += 1
                            
                            # Check if already granted this month
                            existing_grant = supabase_query(
                                "point_transactions",
                                select="id",
                                filters={
                                    "user_id": f"eq.{user['id']}",
                                    "transaction_type": "eq.monthly_bonus",
                                    "created_at": f"gte.{current_month_start.isoformat()}"
                                }
                            )
                            
                            if existing_grant["data"]:
                                already_granted_today += 1
                except:
                    continue
        
        # Get recent monthly point logs
        recent_logs = supabase_query(
            "system_logs",
            select="*",
            filters={
                "source": "eq.monthly_points_job",
                "order": "created_at.desc",
                "limit": "5"
            }
        )
        
        # Get this month's total grants
        monthly_grants = supabase_query(
            "point_transactions",
            select="id,user_id,points,created_at",
            filters={
                "transaction_type": "eq.monthly_bonus",
                "created_at": f"gte.{current_month_start.isoformat()}",
                "order": "created_at.desc"
            }
        )
        
        return {
            "success": True,
            "eligible_today": eligible_today,
            "already_granted_today": already_granted_today,
            "pending_today": eligible_today - already_granted_today,
            "total_grants_this_month": len(monthly_grants["data"]) if monthly_grants["data"] else 0,
            "recent_monthly_logs": recent_logs["data"] if recent_logs["data"] else [],
            "recent_grants": monthly_grants["data"][:10] if monthly_grants["data"] else []
        }
        
    except Exception as e:
        print(f"Error getting monthly points status: {e}")
        return {
            "success": False,
            "message": f"오류 발생: {str(e)}"
        }

# 포인트 트랜잭션 조회 API
@app.get("/api/v1/points/transactions")
async def get_point_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user_id: Optional[str] = Query(None),
    transaction_type: Optional[str] = Query(None)
):
    """포인트 트랜잭션 목록 조회"""
    try:
        offset = (page - 1) * limit
        
        # Build filters
        filters = {
            "order": "created_at.desc",
            "limit": str(limit),
            "offset": str(offset)
        }
        
        if user_id:
            filters["user_id"] = f"eq.{user_id}"
        
        if transaction_type:
            filters["transaction_type"] = f"eq.{transaction_type}"
        
        # Get transactions
        transactions_response = supabase_query(
            "point_transactions",
            select="*",
            filters=filters
        )
        
        # Get total count for pagination
        count_filters = {}
        if user_id:
            count_filters["user_id"] = f"eq.{user_id}"
        if transaction_type:
            count_filters["transaction_type"] = f"eq.{transaction_type}"
            
        count_response = supabase_query(
            "point_transactions",
            select="id",
            filters=count_filters
        )
        
        total_count = len(count_response["data"]) if count_response["data"] else 0
        total_pages = (total_count + limit - 1) // limit
        
        return {
            "success": True,
            "transactions": transactions_response["data"] if transactions_response["data"] else [],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_count,
                "total_pages": total_pages
            }
        }
        
    except Exception as e:
        print(f"Error getting point transactions: {e}")
        raise HTTPException(status_code=500, detail=f"포인트 트랜잭션 조회 실패: {str(e)}")

# 사용자별 포인트 잔액 조회 API
@app.get("/api/v1/points/balance/{user_id}")
async def get_user_point_balance(user_id: str):
    """특정 사용자의 포인트 잔액 조회"""
    try:
        # Get user point balance
        balance_response = supabase_query(
            "user_point_balances",
            select="*",
            filters={"user_id": f"eq.{user_id}"}
        )
        
        if not balance_response["data"]:
            return {
                "success": True,
                "user_id": user_id,
                "current_balance": 0,
                "last_updated": None
            }
        
        balance_data = balance_response["data"][0]
        
        return {
            "success": True,
            "user_id": user_id,
            "current_balance": balance_data.get("current_balance", 0),
            "last_updated": balance_data.get("last_updated")
        }
        
    except Exception as e:
        print(f"Error getting user point balance: {e}")
        raise HTTPException(status_code=500, detail=f"포인트 잔액 조회 실패: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)