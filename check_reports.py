import requests
import os
from dotenv import load_dotenv

load_dotenv('.env.python')

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
headers = {'apikey': key, 'Authorization': f'Bearer {key}'}

response = requests.get(f'{url}/rest/v1/users?select=id,total_reports', headers=headers)
data = response.json()

print('Total reports per user:')
total_sum = 0
for user in data:
    reports = user.get('total_reports', 0)
    total_sum += reports
    print(f'User {user["id"][:8]}: {reports} reports')

print(f'Total sum: {total_sum}')