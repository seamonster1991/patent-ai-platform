-- Enhance technology field functionality for IPC/CPC analysis
-- Add technology field columns to ai_analysis_reports table if not exists
ALTER TABLE ai_analysis_reports 
ADD COLUMN IF NOT EXISTS ipc_codes text[],
ADD COLUMN IF NOT EXISTS technology_field text,
ADD COLUMN IF NOT EXISTS field_confidence numeric(3,2);

-- Create function to classify technology field based on invention title and keywords
CREATE OR REPLACE FUNCTION classify_technology_field(title text, keywords text DEFAULT '')
RETURNS TABLE(field text, confidence numeric) AS $$
DECLARE
    combined_text text;
    field_result text;
    confidence_result numeric;
BEGIN
    combined_text := LOWER(COALESCE(title, '') || ' ' || COALESCE(keywords, ''));
    
    -- AI/Machine Learning
    IF combined_text ~* '(artificial intelligence|machine learning|neural network|deep learning|ai|ml|computer vision|natural language|nlp|chatbot|automation|algorithm|data mining|pattern recognition|인공지능|머신러닝|딥러닝|신경망)' THEN
        field_result := 'AI/머신러닝';
        confidence_result := 0.9;
    -- IoT/Smart Devices
    ELSIF combined_text ~* '(internet of things|iot|smart device|sensor|wireless|bluetooth|wifi|connected device|smart home|wearable|embedded system|사물인터넷|스마트기기|센서|무선)' THEN
        field_result := 'IoT/스마트기기';
        confidence_result := 0.85;
    -- Communication/Network
    ELSIF combined_text ~* '(5g|6g|communication|network|wireless|antenna|signal|transmission|protocol|telecommunication|mobile|cellular|radio frequency|rf|통신|네트워크|안테나|신호)' THEN
        field_result := '통신/네트워크';
        confidence_result := 0.85;
    -- Semiconductor/Electronics
    ELSIF combined_text ~* '(semiconductor|chip|processor|microprocessor|integrated circuit|ic|transistor|memory|storage|electronic|circuit|silicon|wafer|반도체|칩|프로세서|집적회로|트랜지스터|메모리)' THEN
        field_result := '반도체/전자';
        confidence_result := 0.8;
    -- Biotechnology/Medical
    ELSIF combined_text ~* '(biotechnology|biotech|medical|pharmaceutical|drug|medicine|therapy|diagnosis|genetic|dna|protein|vaccine|clinical|healthcare|바이오|의료|제약|치료|진단|유전자|백신)' THEN
        field_result := '바이오/의료';
        confidence_result := 0.8;
    -- Transportation/Automotive
    ELSIF combined_text ~* '(automotive|vehicle|car|truck|transportation|electric vehicle|ev|autonomous|self-driving|battery|engine|motor|navigation|자동차|차량|전기차|자율주행|배터리|엔진|모터)' THEN
        field_result := '교통/자동차';
        confidence_result := 0.8;
    -- Blockchain/Fintech
    ELSIF combined_text ~* '(blockchain|cryptocurrency|bitcoin|fintech|financial technology|digital currency|smart contract|decentralized|crypto|payment|블록체인|암호화폐|비트코인|핀테크|디지털화폐|결제)' THEN
        field_result := '블록체인/핀테크';
        confidence_result := 0.8;
    -- Energy/Environment
    ELSIF combined_text ~* '(renewable energy|solar|wind|battery|energy storage|green technology|environmental|sustainability|carbon|emission|clean energy|재생에너지|태양광|풍력|에너지저장|친환경|지속가능|탄소|배출)' THEN
        field_result := '에너지/환경';
        confidence_result := 0.75;
    -- Manufacturing/Industrial
    ELSIF combined_text ~* '(manufacturing|industrial|automation|robotics|3d printing|additive manufacturing|factory|production|assembly|quality control|제조|산업|자동화|로봇|3d프린팅|공장|생산|조립|품질관리)' THEN
        field_result := '제조/산업';
        confidence_result := 0.75;
    -- Software/Application
    ELSIF combined_text ~* '(software|application|app|program|platform|system|interface|user experience|ux|ui|web|mobile|cloud|saas|소프트웨어|애플리케이션|앱|프로그램|플랫폼|시스템|인터페이스|웹|모바일|클라우드)' THEN
        field_result := '소프트웨어/앱';
        confidence_result := 0.7;
    ELSE
        field_result := '기타';
        confidence_result := 0.5;
    END IF;
    
    RETURN QUERY SELECT field_result, confidence_result;
END;
$$ LANGUAGE plpgsql;

-- Update existing records with technology field classification
UPDATE ai_analysis_reports 
SET (technology_field, field_confidence) = (
    SELECT field, confidence 
    FROM classify_technology_field(invention_title)
)
WHERE technology_field IS NULL;

-- Create function to extract IPC codes from text
CREATE OR REPLACE FUNCTION extract_ipc_codes(text_content text)
RETURNS text[] AS $$
DECLARE
    ipc_pattern text := '[A-H][0-9]{2}[A-Z][0-9]{1,3}/[0-9]{2,4}';
    matches text[];
BEGIN
    SELECT array_agg(DISTINCT match[1])
    INTO matches
    FROM regexp_matches(text_content, ipc_pattern, 'gi') AS match;
    
    RETURN COALESCE(matches, ARRAY[]::text[]);
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to automatically classify technology field for new reports
CREATE OR REPLACE FUNCTION trigger_classify_report_technology()
RETURNS TRIGGER AS $$
BEGIN
    -- Classify technology field if not provided
    IF NEW.technology_field IS NULL THEN
        SELECT field, confidence 
        INTO NEW.technology_field, NEW.field_confidence
        FROM classify_technology_field(NEW.invention_title);
    END IF;
    
    -- Extract IPC codes if not provided
    IF NEW.ipc_codes IS NULL OR array_length(NEW.ipc_codes, 1) IS NULL THEN
        NEW.ipc_codes := extract_ipc_codes(
            COALESCE(NEW.invention_title, '') || ' ' || 
            COALESCE(NEW.market_penetration, '') || ' ' ||
            COALESCE(NEW.competitive_landscape, '')
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic classification
DROP TRIGGER IF EXISTS trigger_auto_classify_report ON ai_analysis_reports;
CREATE TRIGGER trigger_auto_classify_report
    BEFORE INSERT OR UPDATE ON ai_analysis_reports
    FOR EACH ROW
    EXECUTE FUNCTION trigger_classify_report_technology();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_analysis_reports_technology_field ON ai_analysis_reports(technology_field);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_reports_user_created ON ai_analysis_reports(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_search_history_technology_field ON search_history(technology_field);
CREATE INDEX IF NOT EXISTS idx_search_history_user_created ON search_history(user_id, created_at);

-- Create view for technology field statistics
CREATE OR REPLACE VIEW technology_field_stats AS
SELECT 
    'search' as data_type,
    technology_field,
    COUNT(*) as count,
    COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
FROM search_history 
WHERE technology_field IS NOT NULL 
    AND created_at >= NOW() - INTERVAL '100 days'
GROUP BY technology_field

UNION ALL

SELECT 
    'report' as data_type,
    technology_field,
    COUNT(*) as count,
    COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
FROM ai_analysis_reports 
WHERE technology_field IS NOT NULL 
    AND created_at >= NOW() - INTERVAL '100 days'
GROUP BY technology_field;

COMMENT ON VIEW technology_field_stats IS 'Statistics for technology field distribution in searches and reports (last 100 days)';

-- Test the classification function
SELECT 'Testing technology field classification:' as test_info;
SELECT * FROM classify_technology_field('Artificial Intelligence based Machine Learning System for Computer Vision');
SELECT * FROM classify_technology_field('IoT Smart Home Device with Wireless Sensor Network');
SELECT * FROM classify_technology_field('5G Communication Network Protocol for Mobile Devices');
SELECT * FROM classify_technology_field('Semiconductor Memory Chip with Integrated Circuit Design');