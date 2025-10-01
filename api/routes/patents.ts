import express, { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Request 인터페이스 확장
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
      };
    }
  }
}

dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const router = express.Router();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface PatentSearchQuery {
  keyword: string;
  category?: string;
  country?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

interface PatentData {
  id: string;
  title: string;
  abstract: string;
  inventors: string[];
  assignee: string;
  applicationDate: string;
  publicationDate: string;
  patentNumber: string;
  ipcClass: string;
  country: string;
  status: string;
  claims: string[];
  description: string;
}

// Mock patent data for demonstration
const mockPatents: PatentData[] = [
  {
    id: '1',
    title: 'AI-based Image Recognition System for Medical Diagnosis',
    abstract: 'A system that uses artificial intelligence to analyze medical images and provide diagnostic assistance to healthcare professionals.',
    inventors: ['김철수', '이영희', '박민수'],
    assignee: 'Samsung Electronics Co., Ltd.',
    applicationDate: '2023-01-15',
    publicationDate: '2023-07-15',
    patentNumber: 'KR10-2023-0123456',
    ipcClass: 'G06T 7/00',
    country: 'KR',
    status: 'Published',
    claims: [
      'A method for analyzing medical images using artificial intelligence',
      'A system comprising image processing modules and AI algorithms',
      'A computer-readable medium storing instructions for medical image analysis'
    ],
    description: 'This invention relates to a medical image analysis system that leverages deep learning algorithms to assist in medical diagnosis...'
  },
  {
    id: '2',
    title: 'Blockchain-based Supply Chain Management System',
    abstract: 'A decentralized system for tracking and managing supply chain operations using blockchain technology.',
    inventors: ['최민호', '정수연'],
    assignee: 'LG Electronics Inc.',
    applicationDate: '2023-02-20',
    publicationDate: '2023-08-20',
    patentNumber: 'KR10-2023-0234567',
    ipcClass: 'G06Q 10/08',
    country: 'KR',
    status: 'Published',
    claims: [
      'A blockchain-based method for supply chain tracking',
      'A distributed ledger system for inventory management',
      'Smart contracts for automated supply chain operations'
    ],
    description: 'This patent describes a comprehensive blockchain solution for supply chain management...'
  }
];

// 특허 검색 API 라우트
router.get('/search', async (req: Request, res: Response) => {
  try {
    const {
      keyword,
      category,
      country = 'KR',
      dateFrom,
      dateTo,
      page = 1,
      limit = 10
    } = req.query as unknown as PatentSearchQuery;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        error: 'Keyword is required'
      });
    }

    // Filter mock patents based on search criteria
    let filteredPatents = mockPatents.filter(patent => 
      patent.title.toLowerCase().includes(keyword.toLowerCase()) ||
      patent.abstract.toLowerCase().includes(keyword.toLowerCase())
    );

    if (category) {
      filteredPatents = filteredPatents.filter(patent => 
        patent.ipcClass.includes(category)
      );
    }

    if (country) {
      filteredPatents = filteredPatents.filter(patent => 
        patent.country === country
      );
    }

    // Pagination
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedResults = filteredPatents.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        patents: paginatedResults,
        total: filteredPatents.length,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(filteredPatents.length / Number(limit))
      }
    });
  } catch (error) {
    console.error('Patent search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search patents'
    });
  }
});

// 디버깅용 테스트 엔드포인트 - /:id 라우트보다 먼저 배치
router.get('/test-kipris', async (req: Request, res: Response) => {
  try {
    const serviceKey = process.env.KIPRIS_SERVICE_KEY;
    const kiprisApiUrl = 'http://plus.kipris.or.kr/kipo-api/kipi/patUtiModInfoSearchSevice/getAdvancedSearch';
    
    if (!serviceKey) {
      return res.status(500).json({
        success: false,
        error: 'KIPRIS_SERVICE_KEY가 설정되지 않았습니다.'
      });
    }

    // 간단한 테스트 검색
    const params = new URLSearchParams();
    params.append('word', '인공지능');
    params.append('pageNo', '1');
    params.append('numOfRows', '5');
    params.append('ServiceKey', serviceKey);
    
    const fullUrl = `${kiprisApiUrl}?${params.toString()}`;
    console.log('🧪 [TEST] KIPRIS API 테스트 호출:', fullUrl.replace(serviceKey, '[SERVICE_KEY]'));
    
    const response = await axios.get(fullUrl, {
      timeout: 30000,
      headers: {
        'Accept': 'application/xml',
        'User-Agent': 'Patent-AI-Test'
      }
    });
    
    console.log('🧪 [TEST] 응답 상태:', response.status);
    console.log('🧪 [TEST] 원본 XML (처음 1000자):', response.data.substring(0, 1000));
    
    // XML을 JSON으로 변환
    const jsonData = await parseStringPromise(response.data, {
      explicitArray: false,
      ignoreAttrs: true,
      trim: true
    });
    
    console.log('🧪 [TEST] JSON 변환 결과:', JSON.stringify(jsonData, null, 2));
    
    res.json({
      success: true,
      rawXml: response.data.substring(0, 1000),
      jsonData: jsonData,
      analysis: {
        hasResponse: !!jsonData.response,
        hasHeader: !!(jsonData.response && jsonData.response.header),
        hasBody: !!(jsonData.response && jsonData.response.body),
        hasItems: !!(jsonData.response && jsonData.response.body && jsonData.response.body.items),
        hasCount: !!(jsonData.response && jsonData.response.body && jsonData.response.body.count),
        bodyKeys: jsonData.response && jsonData.response.body ? Object.keys(jsonData.response.body) : []
      }
    });
    
  } catch (error: any) {
    console.error('🧪 [TEST] KIPRIS API 테스트 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : null
    });
  }
});

// Get patent by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const patent = mockPatents.find(p => p.id === id);

    if (!patent) {
      return res.status(404).json({
        success: false,
        error: 'Patent not found'
      });
    }

    res.json({
      success: true,
      data: patent
    });
  } catch (error) {
    console.error('Patent detail error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get patent details'
    });
  }
});

// Generate AI analysis report
router.post('/:id/analyze', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { analysisType = 'comprehensive' } = req.body;

    const patent = mockPatents.find(p => p.id === id);
    if (!patent) {
      return res.status(404).json({
        success: false,
        error: 'Patent not found'
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    let prompt = '';
    switch (analysisType) {
      case 'market':
        prompt = `Analyze the market potential of this patent:
Title: ${patent.title}
Abstract: ${patent.abstract}
IPC Class: ${patent.ipcClass}

Please provide:
1. Market size and growth potential
2. Target industries and applications
3. Competitive landscape
4. Market entry barriers
5. Revenue potential assessment`;
        break;
      case 'technical':
        prompt = `Provide a technical analysis of this patent:
Title: ${patent.title}
Abstract: ${patent.abstract}
Claims: ${patent.claims.join('; ')}

Please analyze:
1. Technical innovation and novelty
2. Implementation complexity
3. Technical advantages and limitations
4. Potential improvements or variations
5. Technical risk assessment`;
        break;
      case 'legal':
        prompt = `Analyze the legal aspects of this patent:
Title: ${patent.title}
Patent Number: ${patent.patentNumber}
Status: ${patent.status}
Claims: ${patent.claims.join('; ')}

Please provide:
1. Patent strength and enforceability
2. Potential infringement risks
3. Prior art considerations
4. Licensing opportunities
5. Legal risk assessment`;
        break;
      default:
        prompt = `Provide a comprehensive analysis of this patent:
Title: ${patent.title}
Abstract: ${patent.abstract}
Inventors: ${patent.inventors.join(', ')}
Assignee: ${patent.assignee}
IPC Class: ${patent.ipcClass}
Claims: ${patent.claims.join('; ')}

Please analyze:
1. Technical innovation and market potential
2. Competitive advantages
3. Commercial viability
4. Implementation challenges
5. Strategic recommendations`;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysis = response.text();

    res.json({
      success: true,
      data: {
        patentId: id,
        analysisType,
        analysis,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('AI analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI analysis'
    });
  }
});

// Get trending patents
router.get('/trending/list', async (req: Request, res: Response) => {
  try {
    // Return mock trending patents
    const trendingPatents = mockPatents.slice(0, 5).map(patent => ({
      ...patent,
      trendScore: Math.floor(Math.random() * 100) + 1,
      weeklyViews: Math.floor(Math.random() * 1000) + 100
    }));

    res.json({
      success: true,
      data: trendingPatents
    });
  } catch (error) {
    console.error('Trending patents error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trending patents'
    });
  }
});

// KIPRIS API 통합 검색 라우트
router.post('/kipris-search', async (req: Request, res: Response) => {
  try {
    const searchParams = req.body;
    
    // KIPRIS API 서비스 키 (환경변수에서 가져오기)
    const serviceKey = process.env.KIPRIS_SERVICE_KEY || process.env.KIPRIS_API_KEY || 'your_service_key_here';
    
    console.log('🔍 KIPRIS API 검색 요청:', {
      searchParams: JSON.stringify(searchParams, null, 2),
      serviceKeyExists: serviceKey !== 'your_service_key_here',
      serviceKeyLength: serviceKey.length
    });
    
    // KIPRIS API URL
    const kiprisApiUrl = 'http://plus.kipris.or.kr/kipo-api/kipi/patUtiModInfoSearchSevice/getAdvancedSearch';
    
    // 검색 파라미터 준비
    const params = new URLSearchParams();
    
    // 기본 검색 필드 - keyword를 word로 변환 (호환성)
    const searchWord = searchParams.word || searchParams.keyword;
    if (searchWord) params.append('word', searchWord);
    if (searchParams.inventionTitle) params.append('inventionTitle', searchParams.inventionTitle);
    if (searchParams.astrtCont) params.append('astrtCont', searchParams.astrtCont);
    if (searchParams.claimScope) params.append('claimScope', searchParams.claimScope);
    if (searchParams.ipcNumber) params.append('ipcNumber', searchParams.ipcNumber);
    
    // 번호 검색
    if (searchParams.applicationNumber) params.append('applicationNumber', searchParams.applicationNumber);
    if (searchParams.openNumber) params.append('openNumber', searchParams.openNumber);
    if (searchParams.publicationNumber) params.append('publicationNumber', searchParams.publicationNumber);
    if (searchParams.registerNumber) params.append('registerNumber', searchParams.registerNumber);
    if (searchParams.priorityApplicationNumber) params.append('priorityApplicationNumber', searchParams.priorityApplicationNumber);
    if (searchParams.internationalApplicationNumber) params.append('internationalApplicationNumber', searchParams.internationalApplicationNumber);
    if (searchParams.internationOpenNumber) params.append('internationOpenNumber', searchParams.internationOpenNumber);
    
    // 날짜 검색
    if (searchParams.applicationDate) params.append('applicationDate', searchParams.applicationDate);
    if (searchParams.openDate) params.append('openDate', searchParams.openDate);
    if (searchParams.publicationDate) params.append('publicationDate', searchParams.publicationDate);
    if (searchParams.registerDate) params.append('registerDate', searchParams.registerDate);
    if (searchParams.priorityApplicationDate) params.append('priorityApplicationDate', searchParams.priorityApplicationDate);
    if (searchParams.internationalApplicationDate) params.append('internationalApplicationDate', searchParams.internationalApplicationDate);
    if (searchParams.internationOpenDate) params.append('internationOpenDate', searchParams.internationOpenDate);
    
    // 인물 정보
    if (searchParams.applicant) params.append('applicant', searchParams.applicant);
    if (searchParams.inventors) params.append('inventors', searchParams.inventors);
    if (searchParams.agent) params.append('agent', searchParams.agent);
    if (searchParams.rightHoler) params.append('rightHoler', searchParams.rightHoler);
    
    // 특허 유형
    if (searchParams.patent !== undefined) params.append('patent', searchParams.patent.toString());
    if (searchParams.utility !== undefined) params.append('utility', searchParams.utility.toString());
    
    // 행정처분 상태
    if (searchParams.lastvalue) params.append('lastvalue', searchParams.lastvalue);
    
    // 페이지네이션 및 정렬
    params.append('pageNo', (searchParams.pageNo || 1).toString());
    params.append('numOfRows', (searchParams.numOfRows || 30).toString());
    if (searchParams.sortSpec) params.append('sortSpec', searchParams.sortSpec);
    if (searchParams.descSort !== undefined) params.append('descSort', searchParams.descSort.toString());
    
    // 서비스 키 추가
    params.append('ServiceKey', serviceKey);
    
    const fullUrl = `${kiprisApiUrl}?${params.toString()}`;
    console.log('📡 KIPRIS API 호출 URL:', fullUrl.replace(serviceKey, '[SERVICE_KEY]'));
    
    // KIPRIS API 호출
    const response = await axios.get(fullUrl, {
      timeout: 30000, // 30초 타임아웃
      headers: {
        'Accept': 'application/xml',
        'User-Agent': 'Patent-AI-Application'
      }
    });
    
    console.log('✅ KIPRIS API 응답 상태:', response.status, response.statusText);
    
    // XML 응답을 JSON으로 변환
    const xmlData = response.data;
    console.log('🔍 원본 XML 응답 (처음 1000자):', xmlData.substring(0, 1000));
    
    const jsonData = await parseStringPromise(xmlData, {
      explicitArray: false,
      ignoreAttrs: true,
      trim: true
    });
    
    console.log('🔄 JSON 변환 완료. 전체 구조:', JSON.stringify(jsonData, null, 2));
    
    // 응답 구조 상세 분석
    if (jsonData.response && jsonData.response.body) {
      console.log('📋 Body 구조 상세 분석:', {
        bodyKeys: Object.keys(jsonData.response.body),
        hasItems: !!jsonData.response.body.items,
        hasCount: !!jsonData.response.body.count,
        hasNumOfRows: !!jsonData.response.body.numOfRows,
        hasPageNo: !!jsonData.response.body.pageNo,
        hasTotalCount: !!jsonData.response.body.totalCount,
        bodyStructure: JSON.stringify(jsonData.response.body, null, 2)
      });
    }
    
    // KIPRIS API 응답 구조 확인 및 변환
    console.log('📊 KIPRIS API 응답 구조:', {
      hasResponse: !!jsonData.response,
      hasHeader: !!(jsonData.response && jsonData.response.header),
      hasBody: !!(jsonData.response && jsonData.response.body),
      hasItems: !!(jsonData.response && jsonData.response.body && jsonData.response.body.items),
      hasCount: !!(jsonData.response && jsonData.response.body && jsonData.response.body.count)
    });
    
    // count 정보 상세 로그
    if (jsonData.response && jsonData.response.body && jsonData.response.body.count) {
      console.log('📈 Count 정보 상세:', {
        rawCount: jsonData.response.body.count,
        totalCountRaw: jsonData.response.body.count.totalCount,
        totalCountType: typeof jsonData.response.body.count.totalCount,
        totalCountParsed: parseInt(jsonData.response.body.count.totalCount) || 0
      });
    } else {
      console.log('❌ Count 정보 없음');
    }
    
    let kiprisResponse;
    if (jsonData.response) {
      kiprisResponse = {
        header: jsonData.response.header || {},
        body: {
          items: [],
          count: {
            numOfRows: 0,
            pageNo: 1,
            totalCount: 0
          }
        }
      };
      
      // items 처리
      if (jsonData.response.body && jsonData.response.body.items) {
        const items = jsonData.response.body.items.item;
        if (Array.isArray(items)) {
          kiprisResponse.body.items = items;
        } else if (items) {
          kiprisResponse.body.items = [items];
        }
      }
      
      // count 정보 처리 (totalCount 포함) - 올바른 경로: response.count
      if (jsonData.response.count) {
        console.log('📊 count 추출 시도 (response.count):', jsonData.response.count);
        
        kiprisResponse.body.count = {
          numOfRows: parseInt(jsonData.response.count.numOfRows) || parseInt(searchParams.numOfRows) || 30,
          pageNo: parseInt(jsonData.response.count.pageNo) || parseInt(searchParams.pageNo) || 1,
          totalCount: parseInt(jsonData.response.count.totalCount) || 0
        };
        
        console.log('📊 totalCount 추출:', {
          raw: jsonData.response.count.totalCount,
          parsed: parseInt(jsonData.response.count.totalCount),
          type: typeof jsonData.response.count.totalCount
        });
        console.log('✅ 최종 kiprisResponse.body.count:', kiprisResponse.body.count);
      } else {
        console.log('⚠️ response.count가 없음, 기본값 사용');
        kiprisResponse.body.count = {
          numOfRows: parseInt(searchParams.numOfRows) || 30,
          pageNo: parseInt(searchParams.pageNo) || 1,
          totalCount: kiprisResponse.body.items.length // items 길이로 추정
        };
      }
    } else {
      // 응답 구조가 예상과 다른 경우 기본 구조 반환
      kiprisResponse = {
        header: {
          successYN: 'N',
          resultCode: '99',
          resultMsg: '응답 형식 오류'
        },
        body: {
          items: [],
          count: {
            numOfRows: 0,
            pageNo: 1,
            totalCount: 0
          }
        }
      };
    }
    
    console.log('📤 KIPRIS API 최종 응답:', {
      success: kiprisResponse.header.successYN === 'Y',
      itemCount: kiprisResponse.body.items.length,
      totalCount: kiprisResponse.body.count.totalCount,
      resultCode: kiprisResponse.header.resultCode,
      resultMsg: kiprisResponse.header.resultMsg
    });
    
    res.json({
      success: true,
      data: kiprisResponse
    });
    
  } catch (error: any) {
    console.error('KIPRIS API error:', error);
    
    // 에러 타입에 따른 메시지 처리
    let errorMessage = 'KIPRIS API 호출 중 오류가 발생했습니다.';
    
    if (error.code === 'ECONNABORTED') {
      errorMessage = 'KIPRIS API 응답 시간이 초과되었습니다.';
    } else if (error.response) {
      errorMessage = `KIPRIS API 오류: ${error.response.status} ${error.response.statusText}`;
    } else if (error.request) {
      errorMessage = 'KIPRIS API 서버에 연결할 수 없습니다.';
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// KIPRIS 특허 상세정보 API 라우트
router.get('/detail/:applicationNumber', async (req: Request, res: Response) => {
  try {
    const { applicationNumber } = req.params;
    
    if (!applicationNumber) {
      return res.status(400).json({
        success: false,
        error: 'Application number is required'
      });
    }
    
    // KIPRIS API 서비스 키 (환경변수에서 가져오기)
    const serviceKey = process.env.KIPRIS_SERVICE_KEY || process.env.KIPRIS_API_KEY || 'your_service_key_here';
    
    // KIPRIS 서지상세정보 API URL
    const kiprisApiUrl = 'http://plus.kipris.or.kr/kipo-api/kipi/patUtiModInfoSearchSevice/getBibliographyDetailInfoSearch';
    
    // API 요청 파라미터
    const params = new URLSearchParams({
      applicationNumber: applicationNumber,
      ServiceKey: serviceKey
    });
    
    console.log('Calling KIPRIS Detail API:', `${kiprisApiUrl}?${params.toString()}`);
    
    // KIPRIS API 호출
    const response = await axios.get(`${kiprisApiUrl}?${params.toString()}`, {
      timeout: 30000,
      headers: {
        'Accept': 'application/xml',
        'User-Agent': 'Patent-AI-App/1.0'
      }
    });
    
    console.log('KIPRIS Detail API Response Status:', response.status);
    
    // XML 응답을 JSON으로 파싱
    const xmlData = response.data;
    const jsonData = await parseStringPromise(xmlData, {
      explicitArray: false,
      ignoreAttrs: true,
      trim: true
    });
    
    console.log('Parsed JSON Data:', JSON.stringify(jsonData, null, 2));
    
    // 응답 구조 확인
    if (!jsonData.response || !jsonData.response.body) {
      return res.status(404).json({
        success: false,
        error: 'No patent data found'
      });
    }
    
    const body = jsonData.response.body;
    const header = jsonData.response.header;
    
    // API 응답 상태 확인
    if (header && header.successYN !== 'Y') {
      return res.status(400).json({
        success: false,
        error: header.resultMsg || 'KIPRIS API error'
      });
    }
    
    // 특허 상세정보 추출 및 변환
    const item = body.item;
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Patent not found'
      });
    }
    
    // 배열 형태로 변환하는 헬퍼 함수
    const ensureArray = (data: any) => {
      if (!data) return [];
      return Array.isArray(data) ? data : [data];
    };
    
    // 응답 데이터 구조화 - 프론트엔드에서 기대하는 Array 구조로 맞춤
    const patentDetail = {
      // 서지요약정보 - Array 구조로 래핑
      biblioSummaryInfoArray: {
        biblioSummaryInfo: item.biblioSummaryInfoArray?.biblioSummaryInfo || null
      },
      
      // IPC 정보 - Array 구조로 래핑
      ipcInfoArray: {
        ipcInfo: ensureArray(item.ipcInfoArray?.ipcInfo)
      },
      
      // 패밀리 정보 - Array 구조로 래핑
      familyInfoArray: {
        familyInfo: ensureArray(item.familyInfoArray?.familyInfo)
      },
      
      // 초록 정보 - Array 구조로 래핑
      abstractInfoArray: {
        abstractInfo: item.abstractInfoArray?.abstractInfo || null
      },
      
      // 국제출원 정보 - Array 구조로 래핑
      internationalInfoArray: {
        internationalInfo: ensureArray(item.internationalInfoArray?.internationalInfo)
      },
      
      // 청구항 정보 - Array 구조로 래핑
      claimInfoArray: {
        claimInfo: ensureArray(item.claimInfoArray?.claimInfo)
      },
      
      // 출원인 정보 - Array 구조로 래핑
      applicantInfoArray: {
        applicantInfo: ensureArray(item.applicantInfoArray?.applicantInfo)
      },
      
      // 발명자 정보 - Array 구조로 래핑
      inventorInfoArray: {
        inventorInfo: ensureArray(item.inventorInfoArray?.inventorInfo)
      },
      
      // 대리인 정보 - Array 구조로 래핑
      agentInfoArray: {
        agentInfo: ensureArray(item.agentInfoArray?.agentInfo)
      },
      
      // 우선권 정보 - Array 구조로 래핑
      priorityInfoArray: {
        priorityInfo: ensureArray(item.priorityInfoArray?.priorityInfo)
      },
      
      // 지정국 정보 - Array 구조로 래핑
      designatedStateInfoArray: {
        designatedStateInfo: ensureArray(item.designatedStateInfoArray?.designatedStateInfo)
      },
      
      // 선행기술조사문헌 정보 - Array 구조로 래핑
      priorArtDocumentsInfoArray: {
        priorArtDocumentsInfo: ensureArray(item.priorArtDocumentsInfoArray?.priorArtDocumentsInfo)
      },
      
      // 법적상태 정보 - Array 구조로 래핑
      legalStatusInfoArray: {
        legalStatusInfo: ensureArray(item.legalStatusInfoArray?.legalStatusInfo)
      },
      
      // 이미지 경로 정보
      imagePathInfo: item.imagePathInfo || null,
      
      // 연구개발사업 정보 - Array 구조로 래핑
      rndInfoArray: {
        rndInfo: ensureArray(item.rndInfoArray?.rndInfo)
      }
    };
    
    res.json({
      success: true,
      data: patentDetail
    });
    
  } catch (error: any) {
    console.error('Patent detail API error:', error);
    
    let errorMessage = 'Failed to fetch patent details';
    if (error.response) {
      errorMessage = `KIPRIS API error: ${error.response.status} ${error.response.statusText}`;
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'Request timeout - KIPRIS API is not responding';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Cannot connect to KIPRIS API';
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// AI 분석 API 엔드포인트
router.post('/analyze/:applicationNumber', async (req: Request, res: Response) => {
  try {
    const { applicationNumber } = req.params;
    
    if (!applicationNumber) {
      return res.status(400).json({
        success: false,
        error: 'Application number is required'
      });
    }

    // 먼저 특허 상세정보를 가져옴
    const serviceKey = process.env.KIPRIS_SERVICE_KEY || process.env.KIPRIS_API_KEY || 'your_service_key_here';
    const kiprisApiUrl = 'http://plus.kipris.or.kr/kipo-api/kipi/patUtiModInfoSearchSevice/getBibliographyDetailInfoSearch';
    
    const params = new URLSearchParams({
      applicationNumber: applicationNumber,
      ServiceKey: serviceKey
    });
    
    console.log('Fetching patent details for AI analysis:', applicationNumber);
    
    // KIPRIS API 호출
    const response = await axios.get(`${kiprisApiUrl}?${params.toString()}`, {
      timeout: 30000,
      headers: {
        'Accept': 'application/xml',
        'User-Agent': 'Patent-AI-App/1.0'
      }
    });
    
    // XML 응답을 JSON으로 파싱
    const xmlData = response.data;
    const jsonData = await parseStringPromise(xmlData, {
      explicitArray: false,
      ignoreAttrs: true,
      trim: true
    });
    
    if (!jsonData.response || !jsonData.response.body) {
      return res.status(404).json({
        success: false,
        error: 'Patent data not found'
      });
    }

    const patentData = jsonData.response.body.item;
    const inventionTitle = patentData.biblioSummaryInfoArray?.biblioSummaryInfo?.inventionTitle || '';
    const abstract = patentData.abstractInfoArray?.abstractInfo?.astrtCont || '';

    if (!inventionTitle || !abstract) {
      return res.status(400).json({
        success: false,
        error: 'Patent title or abstract not found'
      });
    }

    console.log('Generating AI analysis for:', inventionTitle);

    // Gemini AI 모델 초기화
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // 시장분석 리포트 생성
    const marketAnalysisPrompt = `
다음 특허 정보를 바탕으로 시장분석 리포트를 작성해주세요:

특허 제목: ${inventionTitle}
특허 요약: ${abstract}

다음 4가지 항목에 대해 각각 2-3문단으로 상세히 분석해주세요:

1. 시장 침투력: 이 기술이 시장에 진입할 때의 잠재력과 채택 가능성
2. 경쟁 구도: 현재 시장의 경쟁사들과 이 기술의 차별화 요소
3. 시장 성장 동력: 이 기술이 시장 성장을 이끌 수 있는 요인들
4. 위험 요소: 시장 진입 시 예상되는 리스크와 장애물

각 항목은 명확하게 구분하여 작성하고, 구체적이고 실용적인 분석을 제공해주세요.
`;

    const businessInsightPrompt = `
다음 특허 정보를 바탕으로 비즈니스 인사이트 리포트를 작성해주세요:

특허 제목: ${inventionTitle}
특허 요약: ${abstract}

다음 4가지 항목에 대해 각각 2-3문단으로 상세히 분석해주세요:

1. 수익 모델: 이 기술을 활용한 다양한 수익 창출 방안
2. 로열티 마진: 라이선싱 시 예상되는 로열티 수준과 수익성
3. 신사업 기회: 이 기술을 기반으로 한 새로운 사업 영역과 기회
4. 경쟁사 대응 전략: 경쟁사들이 이 기술에 대응할 수 있는 전략과 대비책

각 항목은 명확하게 구분하여 작성하고, 실제 비즈니스에 적용 가능한 구체적인 인사이트를 제공해주세요.
`;

    // 병렬로 두 리포트 생성
    const [marketAnalysisResult, businessInsightResult] = await Promise.all([
      model.generateContent(marketAnalysisPrompt),
      model.generateContent(businessInsightPrompt)
    ]);

    const marketAnalysisText = marketAnalysisResult.response.text();
    const businessInsightText = businessInsightResult.response.text();

    // 텍스트를 파싱하여 구조화된 데이터로 변환
    const parseAnalysisText = (text: string) => {
      const sections = text.split(/\d+\.\s+/);
      return {
        section1: sections[1] || '',
        section2: sections[2] || '',
        section3: sections[3] || '',
        section4: sections[4] || ''
      };
    };

    const marketSections = parseAnalysisText(marketAnalysisText);
    const businessSections = parseAnalysisText(businessInsightText);

    const analysisReport = {
      applicationNumber,
      inventionTitle,
      marketAnalysis: {
        marketPenetration: marketSections.section1,
        competitiveLandscape: marketSections.section2,
        marketGrowthDrivers: marketSections.section3,
        riskFactors: marketSections.section4
      },
      businessInsight: {
        revenueModel: businessSections.section1,
        royaltyMargin: businessSections.section2,
        newBusinessOpportunities: businessSections.section3,
        competitorResponseStrategy: businessSections.section4
      },
      generatedAt: new Date().toISOString()
    };

    // Supabase에 AI 분석 결과 저장
    try {
      const { data: savedReport, error: saveError } = await supabase
        .from('ai_analysis_reports')
        .insert({
          application_number: applicationNumber,
          invention_title: inventionTitle,
          market_penetration: marketSections.section1,
          competitive_landscape: marketSections.section2,
          market_growth_drivers: marketSections.section3,
          risk_factors: marketSections.section4,
          revenue_model: businessSections.section1,
          royalty_margin: businessSections.section2,
          new_business_opportunities: businessSections.section3,
          competitor_response_strategy: businessSections.section4,
          user_id: req.user?.id || null // 사용자 인증이 있는 경우
        })
        .select()
        .single();

      if (saveError) {
        console.warn('Failed to save AI analysis to database:', saveError);
        // 저장 실패해도 분석 결과는 반환
      } else {
        console.log('AI analysis saved to database successfully');
      }
    } catch (dbError) {
      console.warn('Database save error:', dbError);
      // 저장 실패해도 분석 결과는 반환
    }

    console.log('AI analysis completed successfully');

    res.json({
      success: true,
      data: analysisReport
    });

  } catch (error: any) {
    console.error('AI Analysis Error:', error);
    
    let errorMessage = 'Failed to generate AI analysis';
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      errorMessage = 'Cannot connect to external services';
    } else if (error.response?.status === 429) {
      errorMessage = 'API rate limit exceeded. Please try again later.';
    } else if (error.response?.status === 401) {
      errorMessage = 'API authentication failed';
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 문서 다운로드 API 엔드포인트
router.get('/documents/:applicationNumber', async (req: Request, res: Response) => {
  try {
    const { applicationNumber } = req.params;
    const { documentType } = req.query;
    
    if (!applicationNumber) {
      return res.status(400).json({
        success: false,
        error: 'Application number is required'
      });
    }

    if (!documentType) {
      return res.status(400).json({
        success: false,
        error: 'Document type is required'
      });
    }

    const serviceKey = process.env.KIPRIS_SERVICE_KEY || process.env.KIPRIS_API_KEY || 'your_service_key_here';
    const baseUrl = 'http://plus.kipris.or.kr/kipo-api/kipi/patUtiModInfoSearchSevice';
    
    // 문서 타입에 따른 API 엔드포인트 결정
    const documentTypeMap: { [key: string]: string } = {
      'getPubFullTextInfoSearch': 'getPubFullTextInfoSearch', // 공개전문PDF
      'getAnnFullTextInfoSearch': 'getAnnFullTextInfoSearch', // 공고전문PDF
      'getCorrectionAnnouncementInfoSearch': 'getCorrectionAnnouncementInfoSearch', // 정정공고PDF
      'getRepresentativeDrawingInfoSearch': 'getRepresentativeDrawingInfoSearch', // 대표도면
      'getCorrectionAnnouncementV2InfoSearch': 'getCorrectionAnnouncementV2InfoSearch', // 정정공고PDF_V2
      'getPublicationBookletInfoSearch': 'getPublicationBookletInfoSearch', // 공개책자
      'getGazetteBookletInfoSearch': 'getGazetteBookletInfoSearch', // 공보책자
      'getAllDocumentsAvailabilityInfoSearch': 'getAllDocumentsAvailabilityInfoSearch', // 모든 전문 및 대표도 유무
      'getFullTextFileInfoSearch': 'getFullTextFileInfoSearch', // 전문파일정보
      'getStandardizedPubFullTextInfoSearch': 'getStandardizedPubFullTextInfoSearch', // 표준화 공개전문PDF
      'getStandardizedAnnFullTextInfoSearch': 'getStandardizedAnnFullTextInfoSearch' // 표준화 공고전문PDF
    };

    const endpoint = documentTypeMap[documentType as string];
    if (!endpoint) {
      return res.status(400).json({
        success: false,
        error: 'Invalid document type'
      });
    }

    const kiprisApiUrl = `${baseUrl}/${endpoint}`;
    const params = new URLSearchParams({
      applicationNumber: applicationNumber,
      ServiceKey: serviceKey
    });
    
    console.log(`Fetching document: ${documentType} for application: ${applicationNumber}`);
    
    // KIPRIS API 호출
    const response = await axios.get(`${kiprisApiUrl}?${params.toString()}`, {
      timeout: 30000,
      headers: {
        'Accept': 'application/xml',
        'User-Agent': 'Patent-AI-App/1.0'
      }
    });
    
    // XML 응답을 JSON으로 파싱
    const xmlData = response.data;
    const jsonData = await parseStringPromise(xmlData, {
      explicitArray: false,
      ignoreAttrs: true,
      trim: true
    });
    
    if (!jsonData.response || !jsonData.response.body) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // 응답 코드 확인
    const resultCode = jsonData.response.header?.resultCode;
    if (resultCode !== '00') {
      const resultMsg = jsonData.response.header?.resultMsg || 'Unknown error';
      return res.status(404).json({
        success: false,
        error: `KIPRIS API Error: ${resultMsg}`,
        code: resultCode
      });
    }

    const documentInfo = jsonData.response.body.item;
    if (!documentInfo || !documentInfo.docName || !documentInfo.path) {
      return res.status(404).json({
        success: false,
        error: 'Document information not available'
      });
    }

    console.log(`Document found: ${documentInfo.docName}`);

    res.json({
      success: true,
      data: {
        documentInfo: {
          docName: documentInfo.docName,
          path: documentInfo.path
        },
        downloadUrl: documentInfo.path
      }
    });

  } catch (error: any) {
    console.error('Document Download Error:', error);
    
    let errorMessage = 'Failed to fetch document';
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      errorMessage = 'Cannot connect to KIPRIS service';
    } else if (error.response?.status === 429) {
      errorMessage = 'API rate limit exceeded. Please try again later.';
    } else if (error.response?.status === 401) {
      errorMessage = 'API authentication failed';
    } else if (error.response?.status === 404) {
      errorMessage = 'Document not found';
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 문서 가용성 확인 API 엔드포인트
router.get('/documents/:applicationNumber/availability', async (req: Request, res: Response) => {
  try {
    const { applicationNumber } = req.params;
    
    if (!applicationNumber) {
      return res.status(400).json({
        success: false,
        error: 'Application number is required'
      });
    }

    const serviceKey = process.env.KIPRIS_SERVICE_KEY || process.env.KIPRIS_API_KEY || 'your_service_key_here';
    const baseUrl = 'http://plus.kipris.or.kr/kipo-api/kipi/patUtiModInfoSearchSevice';
    
    // 주요 문서 타입들의 가용성 확인
    const documentTypes = [
      'getPubFullTextInfoSearch', // 공개전문PDF
      'getAnnFullTextInfoSearch', // 공고전문PDF
      'getRepresentativeDrawingInfoSearch', // 대표도면
      'getStandardizedPubFullTextInfoSearch', // 표준화 공개전문PDF
      'getStandardizedAnnFullTextInfoSearch' // 표준화 공고전문PDF
    ];

    const availability: { [key: string]: boolean } = {};
    
    // 병렬로 문서 가용성 확인
    const promises = documentTypes.map(async (docType) => {
      try {
        const kiprisApiUrl = `${baseUrl}/${docType}`;
        const params = new URLSearchParams({
          applicationNumber: applicationNumber,
          ServiceKey: serviceKey
        });
        
        const response = await axios.get(`${kiprisApiUrl}?${params.toString()}`, {
          timeout: 10000,
          headers: {
            'Accept': 'application/xml',
            'User-Agent': 'Patent-AI-App/1.0'
          }
        });
        
        const xmlData = response.data;
        const jsonData = await parseStringPromise(xmlData, {
          explicitArray: false,
          ignoreAttrs: true,
          trim: true
        });
        
        const resultCode = jsonData.response?.header?.resultCode;
        const documentInfo = jsonData.response?.body?.item;
        
        availability[docType] = resultCode === '00' && documentInfo && documentInfo.docName && documentInfo.path;
      } catch (error) {
        availability[docType] = false;
      }
    });

    await Promise.all(promises);

    console.log(`Document availability checked for application: ${applicationNumber}`);

    res.json({
      success: true,
      data: {
        applicationNumber,
        availability
      }
    });

  } catch (error: any) {
    console.error('Document Availability Check Error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to check document availability',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;