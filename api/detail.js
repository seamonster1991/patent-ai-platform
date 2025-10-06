const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const { parseStringPromise } = require('xml2js');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;

try {
  if (supabaseUrl && supabaseServiceKey) {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('[detail.js] Supabase 클라이언트 초기화 성공');
  } else {
    console.warn('[detail.js] Supabase 환경변수가 설정되지 않았습니다.');
  }
} catch (e) {
  console.warn('[detail.js] Supabase 클라이언트 초기화 실패:', e?.message || e);
  supabase = null;
}

module.exports = async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { applicationNumber } = req.query;

  if (!applicationNumber) {
    return res.status(400).json({ 
      error: 'applicationNumber parameter is required' 
    });
  }

  try {
    console.log(`📋 특허 상세정보 요청: ${applicationNumber}`);

    // 사용자 활동 로깅
    const userId = req.query.userId;
    if (userId && supabase) {
      try {
        await supabase
          .from('user_activities')
          .insert({
            user_id: userId,
            activity_type: 'patent_view',
            activity_data: {
              application_number: applicationNumber,
              timestamp: new Date().toISOString()
            }
          });
        console.log('✅ 특허 상세보기 활동 로그 저장 완료');
      } catch (logError) {
        console.warn('⚠️ 활동 로그 저장 실패:', logError.message);
      }
    }

    // 실제 KIPRIS API 호출로 특허 상세정보 조회
    const patentDetail = await fetchPatentDetailFromKipris(applicationNumber);

    return res.status(200).json({
      success: true,
      data: {
        header: {
          requestMsgID: "",
          responseTime: new Date().toISOString().replace('T', ' ').substring(0, 23),
          responseMsgID: "",
          successYN: "Y",
          resultCode: "00",
          resultMsg: "NORMAL SERVICE."
        },
        body: {
          item: patentDetail
        }
      }
    });

  } catch (error) {
    console.error('❌ 특허 상세정보 조회 오류:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};

// 실제 KIPRIS API에서 특허 상세정보 조회
async function fetchPatentDetailFromKipris(applicationNumber) {
  try {
    console.log(`🔍 KIPRIS API에서 특허 상세정보 조회: ${applicationNumber}`);
    
    // 환경변수에서 KIPRIS API 키 가져오기
    const kiprisApiKey = process.env.KIPRIS_SERVICE_KEY || process.env.KIPRIS_API_KEY;
    
    if (!kiprisApiKey) {
      console.error('KIPRIS API key not found');
      throw new Error('KIPRIS API key is not configured');
    }

    // KIPRIS 특허 상세정보 API 엔드포인트
    const kiprisDetailUrl = 'http://plus.kipris.or.kr/kipo-api/kipi/patUtiModInfoSearchSevice/getBibliographicDetailInfoSearch';
    
    // API 파라미터 설정
    const params = new URLSearchParams();
    params.append('ServiceKey', kiprisApiKey);
    params.append('applicationNumber', applicationNumber);
    
    const fullUrl = `${kiprisDetailUrl}?${params.toString()}`;
    console.log('📡 KIPRIS 상세정보 API 호출 URL:', fullUrl.replace(kiprisApiKey, '[SERVICE_KEY]'));
    
    // API 호출
    const response = await axios.get(fullUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Patent-AI-System/1.0',
        'Accept': 'application/xml'
      }
    });
    
    console.log('📡 KIPRIS 상세정보 API 응답 상태:', response.status);
    
    // XML 응답을 JSON으로 파싱
    const kiprisResponse = await parseStringPromise(response.data);
    console.log('📊 파싱된 KIPRIS 상세정보 응답:', JSON.stringify(kiprisResponse, null, 2).substring(0, 1000));
    
    // KIPRIS 응답에서 특허 상세정보 추출
    const patentDetail = extractPatentDetailFromKiprisResponse(kiprisResponse, applicationNumber);
    
    if (!patentDetail) {
      console.warn(`⚠️ KIPRIS에서 특허 정보를 찾을 수 없음: ${applicationNumber}`);
      // 폴백으로 기본 특허 정보 생성
      return generateFallbackPatentDetail(applicationNumber);
    }
    
    console.log(`✅ KIPRIS에서 특허 상세정보 조회 완료: ${applicationNumber}`);
    return patentDetail;
    
  } catch (error) {
    console.error(`❌ KIPRIS API 호출 실패 (${applicationNumber}):`, error.message);
    
    // API 호출 실패 시 폴백 데이터 생성
    console.log(`🔄 폴백 데이터 생성: ${applicationNumber}`);
    return generateFallbackPatentDetail(applicationNumber);
  }
}

// KIPRIS XML 응답에서 필드 값 안전하게 추출
function getFieldValue(field) {
  if (!field) return '';
  if (typeof field === 'string') return field.trim();
  if (Array.isArray(field) && field.length > 0) return String(field[0]).trim();
  if (typeof field === 'object' && field._) return String(field._).trim();
  return String(field).trim();
}

// IPC 정보 추출
function extractIpcInfo(ipcInfo) {
  if (!ipcInfo) return [];
  if (!Array.isArray(ipcInfo)) ipcInfo = [ipcInfo];
  
  return ipcInfo.map(ipc => ({
    ipcDate: getFieldValue(ipc.ipcDate),
    ipcNumber: getFieldValue(ipc.ipcNumber)
  }));
}

// 패밀리 정보 추출
function extractFamilyInfo(familyInfo) {
  if (!familyInfo) return {};
  
  return {
    familyApplicationNumber: getFieldValue(familyInfo.familyApplicationNumber),
    familyCountryCode: getFieldValue(familyInfo.familyCountryCode),
    familyApplicationDate: getFieldValue(familyInfo.familyApplicationDate)
  };
}

// 국제 정보 추출
function extractInternationalInfo(internationalInfo) {
  if (!internationalInfo) return [];
  if (!Array.isArray(internationalInfo)) internationalInfo = [internationalInfo];
  
  return internationalInfo.map(info => ({
    internationalApplicationNumber: getFieldValue(info.internationalApplicationNumber),
    internationalApplicationDate: getFieldValue(info.internationalApplicationDate),
    internationalPublicationNumber: getFieldValue(info.internationalPublicationNumber),
    internationalPublicationDate: getFieldValue(info.internationalPublicationDate)
  }));
}

// 출원인 정보 추출
function extractApplicantInfo(applicantInfo) {
  if (!applicantInfo) return [];
  if (!Array.isArray(applicantInfo)) applicantInfo = [applicantInfo];
  
  return applicantInfo.map(applicant => ({
    applicantName: getFieldValue(applicant.applicantName),
    applicantNameEng: getFieldValue(applicant.applicantNameEng),
    applicantAddress: getFieldValue(applicant.applicantAddress),
    applicantAddressEng: getFieldValue(applicant.applicantAddressEng),
    applicantCountryCode: getFieldValue(applicant.applicantCountryCode)
  }));
}

// 발명자 정보 추출
function extractInventorInfo(inventorInfo) {
  if (!inventorInfo) return [];
  if (!Array.isArray(inventorInfo)) inventorInfo = [inventorInfo];
  
  return inventorInfo.map(inventor => ({
    inventorName: getFieldValue(inventor.inventorName),
    inventorNameEng: getFieldValue(inventor.inventorNameEng),
    inventorAddress: getFieldValue(inventor.inventorAddress),
    inventorAddressEng: getFieldValue(inventor.inventorAddressEng),
    inventorCountryCode: getFieldValue(inventor.inventorCountryCode)
  }));
}

// 대리인 정보 추출
function extractAgentInfo(agentInfo) {
  if (!agentInfo) return [];
  if (!Array.isArray(agentInfo)) agentInfo = [agentInfo];
  
  return agentInfo.map(agent => ({
    agentName: getFieldValue(agent.agentName),
    agentNameEng: getFieldValue(agent.agentNameEng),
    agentAddress: getFieldValue(agent.agentAddress),
    agentAddressEng: getFieldValue(agent.agentAddressEng)
  }));
}

// 우선권 정보 추출
function extractPriorityInfo(priorityInfo) {
  if (!priorityInfo) return [];
  if (!Array.isArray(priorityInfo)) priorityInfo = [priorityInfo];
  
  return priorityInfo.map(priority => ({
    priorityApplicationNumber: getFieldValue(priority.priorityApplicationNumber),
    priorityApplicationDate: getFieldValue(priority.priorityApplicationDate),
    priorityCountryCode: getFieldValue(priority.priorityCountryCode)
  }));
}

// 지정국 정보 추출
function extractDesignatedStateInfo(designatedStateInfo) {
  if (!designatedStateInfo) return [];
  if (!Array.isArray(designatedStateInfo)) designatedStateInfo = [designatedStateInfo];
  
  return designatedStateInfo.map(state => ({
    designatedStateCode: getFieldValue(state.designatedStateCode),
    designatedStateName: getFieldValue(state.designatedStateName)
  }));
}

// 선행기술문헌 정보 추출
function extractPriorArtDocumentsInfo(priorArtDocumentsInfo) {
  if (!priorArtDocumentsInfo) return [];
  if (!Array.isArray(priorArtDocumentsInfo)) priorArtDocumentsInfo = [priorArtDocumentsInfo];
  
  return priorArtDocumentsInfo.map(doc => ({
    priorArtDocumentsNumber: getFieldValue(doc.priorArtDocumentsNumber),
    priorArtDocumentsDate: getFieldValue(doc.priorArtDocumentsDate),
    priorArtDocumentsTitle: getFieldValue(doc.priorArtDocumentsTitle)
  }));
}

// 법적상태 정보 추출
function extractLegalStatusInfo(legalStatusInfo) {
  if (!legalStatusInfo) return [];
  if (!Array.isArray(legalStatusInfo)) legalStatusInfo = [legalStatusInfo];
  
  return legalStatusInfo.map(status => ({
    legalStatusCode: getFieldValue(status.legalStatusCode),
    legalStatusName: getFieldValue(status.legalStatusName),
    legalStatusDate: getFieldValue(status.legalStatusDate)
  }));
}

// 이미지 경로 정보 추출
function extractImagePathInfo(imagePathInfo) {
  if (!imagePathInfo) return [];
  if (!Array.isArray(imagePathInfo)) imagePathInfo = [imagePathInfo];
  
  return imagePathInfo.map(image => ({
    largePath: getFieldValue(image.largePath),
    path: getFieldValue(image.path)
  }));
}

// KIPRIS API 응답에서 특허 상세정보 추출
function extractPatentDetailFromKiprisResponse(kiprisResponse, applicationNumber) {
  try {
    const response = kiprisResponse?.response;
    if (!response) return null;

    const body = response.body?.[0];
    if (!body) return null;

    const item = body.item?.[0];
    if (!item) return null;

    // KIPRIS 응답을 프론트엔드 형식으로 변환
    return {
      biblioSummaryInfoArray: {
        biblioSummaryInfo: {
          applicationDate: getFieldValue(item.applicationDate),
          applicationNumber: getFieldValue(item.applicationNumber) || applicationNumber,
          applicationFlag: getFieldValue(item.applicationFlag) || ' ',
          claimCount: getFieldValue(item.claimCount) || '0',
          examinerName: getFieldValue(item.examinerName) || '',
          finalDisposal: getFieldValue(item.finalDisposal) || '',
          inventionTitle: getFieldValue(item.inventionTitle) || '제목 정보 없음',
          inventionTitleEng: getFieldValue(item.inventionTitleEng) || '',
          openDate: getFieldValue(item.openDate) || '',
          openNumber: getFieldValue(item.openNumber) || '',
          originalApplicationDate: getFieldValue(item.originalApplicationDate) || ' ',
          originalApplicationKind: getFieldValue(item.originalApplicationKind) || '',
          originalApplicationNumber: getFieldValue(item.originalApplicationNumber) || ' ',
          originalExaminationRequestDate: getFieldValue(item.originalExaminationRequestDate) || '',
          originalExaminationRequestFlag: getFieldValue(item.originalExaminationRequestFlag) || 'N',
          publicationDate: getFieldValue(item.publicationDate) || '',
          publicationNumber: getFieldValue(item.publicationNumber) || ' ',
          registerDate: getFieldValue(item.registerDate) || '',
          registerNumber: getFieldValue(item.registerNumber) || '',
          registerStatus: getFieldValue(item.registerStatus) || '',
          translationSubmitDate: getFieldValue(item.translationSubmitDate) || ' '
        }
      },
      ipcInfoArray: {
        ipcInfo: extractIpcInfo(item.ipcInfo)
      },
      familyInfoArray: {
        familyInfo: extractFamilyInfo(item.familyInfo)
      },
      abstractInfoArray: {
        abstractInfo: {
          astrtCont: getFieldValue(item.astrtCont) || getFieldValue(item.abstract) || '요약 정보가 없습니다.'
        }
      },
      internationalInfoArray: {
        internationalInfo: extractInternationalInfo(item.internationalInfo)
      },
      applicantInfoArray: {
        applicantInfo: extractApplicantInfo(item.applicantInfo)
      },
      inventorInfoArray: {
        inventorInfo: extractInventorInfo(item.inventorInfo)
      },
      agentInfoArray: {
        agentInfo: extractAgentInfo(item.agentInfo)
      },
      priorityInfoArray: {
        priorityInfo: extractPriorityInfo(item.priorityInfo)
      },
      designatedStateInfoArray: {
        designatedStateInfo: extractDesignatedStateInfo(item.designatedStateInfo)
      },
      priorArtDocumentsInfoArray: {
        priorArtDocumentsInfo: extractPriorArtDocumentsInfo(item.priorArtDocumentsInfo)
      },
      legalStatusInfoArray: {
        legalStatusInfo: extractLegalStatusInfo(item.legalStatusInfo)
      },
      imagePathInfoArray: {
        imagePathInfo: extractImagePathInfo(item.imagePathInfo)
      }
    };

  } catch (error) {
    console.error('❌ KIPRIS 상세정보 응답 파싱 중 오류:', error);
    return null;
  }
}

// 폴백 특허 상세정보 생성 (API 호출 실패 시)
function generateFallbackPatentDetail(applicationNumber) {
  console.log(`🔄 폴백 특허 상세정보 생성: ${applicationNumber}`);
  
  return {
    biblioSummaryInfoArray: {
      biblioSummaryInfo: {
        applicationDate: '2023.01.01',
        applicationNumber: applicationNumber,
        applicationFlag: ' ',
        claimCount: '1',
        examinerName: '정보 없음',
        finalDisposal: '심사중',
        inventionTitle: `${applicationNumber}에 대한 특허 정보`,
        inventionTitleEng: `Patent Information for ${applicationNumber}`,
        openDate: '',
        openNumber: '',
        originalApplicationDate: ' ',
        originalApplicationKind: '국내출원',
        originalApplicationNumber: ' ',
        originalExaminationRequestDate: '',
        originalExaminationRequestFlag: 'N',
        publicationDate: '',
        publicationNumber: ' ',
        registerDate: '',
        registerNumber: '',
        registerStatus: '심사중',
        translationSubmitDate: ' '
      }
    },
    ipcInfoArray: {
      ipcInfo: []
    },
    familyInfoArray: {
      familyInfo: {}
    },
    abstractInfoArray: {
      abstractInfo: {
        astrtCont: '특허 상세정보를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      }
    },
    internationalInfoArray: {
      internationalInfo: []
    },
    applicantInfoArray: {
      applicantInfo: []
    },
    inventorInfoArray: {
      inventorInfo: []
    },
    agentInfoArray: {
      agentInfo: []
    },
    priorityInfoArray: {
      priorityInfo: []
    },
    designatedStateInfoArray: {
      designatedStateInfo: []
    },
    priorArtDocumentsInfoArray: {
      priorArtDocumentsInfo: []
    },
    legalStatusInfoArray: {
      legalStatusInfo: []
    },
    imagePathInfoArray: {
      imagePathInfo: []
    }
  };
}