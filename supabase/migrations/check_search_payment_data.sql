-- Check search history and payment records data
-- This will help us understand the discrepancy in search and payment counts

-- 1. Count total search history records
SELECT 'search_history' as table_name, COUNT(*) as total_records
FROM search_history;

-- 2. Count search history by user
SELECT 
    user_id,
    COUNT(*) as search_count
FROM search_history
GROUP BY user_id
ORDER BY search_count DESC;

-- 3. Count total payment records
SELECT 'payment_records' as table_name, COUNT(*) as total_records
FROM payment_records;

-- 4. Count payment records by user with total amounts
SELECT 
    user_id,
    COUNT(*) as payment_count,
    SUM(amount) as total_amount
FROM payment_records
GROUP BY user_id
ORDER BY payment_count DESC;

-- 5. Show all search history records
SELECT 
    user_id,
    created_at,
    keyword,
    results_count
FROM search_history
ORDER BY created_at DESC
LIMIT 50;

-- 6. Show all payment records
SELECT 
    user_id,
    amount,
    status,
    created_at,
    payment_method
FROM payment_records
ORDER BY created_at DESC
LIMIT 50;