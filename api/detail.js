const axios = require('axios');
const { parseStringPromise } = require('xml2js');

module.exports = async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET 요청만 허용
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed',
      message: 'Only GET method is allowed'
    });
  }

  try {
    console.log('=== KIPRIS API 특허 상세정보 요청 시작 ===');
    console.log('Query parameters:', req.query);

    // 환경변수에서 KIPRIS API 키 가져오기
    const kiprisApiKey = process.env.KIPRIS_API_KEY;
    
    if (!kiprisApiKey) {
      console.error('KIPRIS API key not found in environment variables');
      return res.status(500).json({
        success: false,
        error: 'API configuration error',
        message: 'KIPRIS API key is not configured'
      });
    }

    console.log('KIPRIS API Key found:', kiprisApiKey ? 'Yes' : 'No');
    
    // 출원번호 파라미터 검증
    const { applicationNumber } = req.query;
    
    if (!applicationNumber) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter',
        message: 'applicationNumber parameter is required'
      });
    }

    console.log('출원번호:', applicationNumber);
    
    // KIPRIS API URL (서지상세정보 엔드포인트)
    const kiprisApiUrl = 'http://plus.kipris.or.kr/kipo-api/kipi/patUtiModInfoSearchSevice/getBibliographyDetailInfoSearch';
    
    // 검색 파라미터 준비
    const params = new URLSearchParams();
    params.append('applicationNumber', applicationNumber);
    params.append('ServiceKey', kiprisApiKey);
    
    const fullUrl = `${kiprisApiUrl}?${params.toString()}`;
    console.log('📡 KIPRIS API 호출 URL:', fullUrl.replace(kiprisApiKey, '[SERVICE_KEY]'));
    
    // KIPRIS API 호출
    const response = await axios.get(fullUrl, {
      timeout: 30000,
      headers: {
        'Accept': 'application/xml',
        'User-Agent': 'Patent-AI-Application'
      }
    });
    
    console.log('✅ KIPRIS API 응답 상태:', response.status, response.statusText);
    
    // XML 응답을 JSON으로 변환
    const xmlData = response.data;
    console.log('🔍 원본 XML 응답 (처음 500자):', xmlData.substring(0, 500));
    
    const jsonData = await parseStringPromise(xmlData, {
      explicitArray: false,
      ignoreAttrs: false,
      trim: true
    });
    
    console.log('📄 JSON 변환 완료');
    
    // KIPRIS 응답 구조 파싱
    const kiprisResponse = {
      header: {
        successYN: 'Y',
        resultCode: '00',
        resultMsg: 'NORMAL_SERVICE'
      },
      body: {
        item: {
          biblioSummaryInfo: null,
          ipcInfo: [],
          applicantInfo: [],
          inventorInfo: [],
          abstractInfo: null,
          claimInfo: [],
          agentInfo: [],
          priorityInfo: [],
          familyInfo: [],
          internationalInfo: [],
          designatedStateInfo: [],
          priorArtDocumentsInfo: [],
          legalStatusInfo: [],
          imagePathInfo: null,
          rndInfo: []
        }
      }
    };
    
    // 실제 응답 데이터 처리
    if (jsonData && jsonData.response) {
      const responseData = jsonData.response;
      
      // 헤더 정보 처리
      if (responseData.header) {
        kiprisResponse.header = {
          successYN: responseData.header.successYN || 'Y',
          resultCode: responseData.header.resultCode || '00',
          resultMsg: responseData.header.resultMsg || 'NORMAL_SERVICE'
        };
      }
      
      // 바디 데이터 처리
      if (responseData.body && responseData.body.item) {
        const itemData = responseData.body.item;
        
        // 1. 서지상세정보 (biblioSummaryInfo) 처리
        if (itemData.biblioSummaryInfoArray && itemData.biblioSummaryInfoArray.biblioSummaryInfo) {
          const biblioInfo = itemData.biblioSummaryInfoArray.biblioSummaryInfo;
          kiprisResponse.body.item.biblioSummaryInfo = {
            applicationDate: biblioInfo.applicationDate || '',
            applicationNumber: biblioInfo.applicationNumber || '',
            applicationFlag: biblioInfo.applicationFlag || '',
            claimCount: biblioInfo.claimCount || '',
            examinerName: biblioInfo.examinerName || '',
            finalDisposal: biblioInfo.finalDisposal || '',
            inventionTitle: biblioInfo.inventionTitle || '',
            inventionTitleEng: biblioInfo.inventionTitleEng || '',
            openDate: biblioInfo.openDate || '',
            openNumber: biblioInfo.openNumber || '',
            originalApplicationDate: biblioInfo.originalApplicationDate || '',
            originalApplicationKind: biblioInfo.originalApplicationKind || '',
            originalApplicationNumber: biblioInfo.originalApplicationNumber || '',
            originalExaminationRequestDate: biblioInfo.originalExaminationRequestDate || '',
            originalExaminationRequestFlag: biblioInfo.originalExaminationRequestFlag || '',
            publicationDate: biblioInfo.publicationDate || '',
            publicationNumber: biblioInfo.publicationNumber || '',
            registerDate: biblioInfo.registerDate || '',
            registerNumber: biblioInfo.registerNumber || '',
            registerStatus: biblioInfo.registerStatus || '',
            translationSubmitDate: biblioInfo.translationSubmitDate || ''
          };
        }
        
        // 2. IPC정보 처리
        if (itemData.ipcInfoArray && itemData.ipcInfoArray.ipcInfo) {
          const ipcInfos = Array.isArray(itemData.ipcInfoArray.ipcInfo) 
            ? itemData.ipcInfoArray.ipcInfo 
            : [itemData.ipcInfoArray.ipcInfo];
          
          kiprisResponse.body.item.ipcInfo = ipcInfos.map(ipc => ({
            ipcDate: ipc.ipcDate || '',
            ipcNumber: ipc.ipcNumber || ''
          }));
        }
        
        // 3. 출원인정보 처리
        if (itemData.applicantInfoArray && itemData.applicantInfoArray.applicantInfo) {
          const applicantInfos = Array.isArray(itemData.applicantInfoArray.applicantInfo) 
            ? itemData.applicantInfoArray.applicantInfo 
            : [itemData.applicantInfoArray.applicantInfo];
          
          kiprisResponse.body.item.applicantInfo = applicantInfos.map(applicant => ({
            address: applicant.address || '',
            code: applicant.code || '',
            country: applicant.country || '',
            engName: applicant.engName || '',
            name: applicant.name || ''
          }));
        }
        
        // 4. 발명자정보 처리
        if (itemData.inventorInfoArray && itemData.inventorInfoArray.inventorInfo) {
          const inventorInfos = Array.isArray(itemData.inventorInfoArray.inventorInfo) 
            ? itemData.inventorInfoArray.inventorInfo 
            : [itemData.inventorInfoArray.inventorInfo];
          
          kiprisResponse.body.item.inventorInfo = inventorInfos.map(inventor => ({
            address: inventor.address || '',
            code: inventor.code || '',
            country: inventor.country || '',
            engName: inventor.engName || '',
            name: inventor.name || ''
          }));
        }
        
        // 5. 초록정보 처리
        if (itemData.abstractInfoArray && itemData.abstractInfoArray.abstractInfo) {
          const abstractInfo = itemData.abstractInfoArray.abstractInfo;
          kiprisResponse.body.item.abstractInfo = {
            astrtCont: abstractInfo.astrtCont || ''
          };
        }
        
        // 6. 청구항정보 처리
        if (itemData.claimInfoArray && itemData.claimInfoArray.claimInfo) {
          const claimInfos = Array.isArray(itemData.claimInfoArray.claimInfo) 
            ? itemData.claimInfoArray.claimInfo 
            : [itemData.claimInfoArray.claimInfo];
          
          kiprisResponse.body.item.claimInfo = claimInfos.map(claim => ({
            claim: claim.claim || ''
          }));
        }
        
        // 7. 대리인정보 처리
        if (itemData.agentInfoArray && itemData.agentInfoArray.agentInfo) {
          const agentInfos = Array.isArray(itemData.agentInfoArray.agentInfo) 
            ? itemData.agentInfoArray.agentInfo 
            : [itemData.agentInfoArray.agentInfo];
          
          kiprisResponse.body.item.agentInfo = agentInfos.map(agent => ({
            address: agent.address || '',
            code: agent.code || '',
            country: agent.country || '',
            engName: agent.engName || '',
            name: agent.name || ''
          }));
        }
        
        // 8. 우선권정보 처리
        if (itemData.priorityInfoArray && itemData.priorityInfoArray.priorityInfo) {
          const priorityInfos = Array.isArray(itemData.priorityInfoArray.priorityInfo) 
            ? itemData.priorityInfoArray.priorityInfo 
            : [itemData.priorityInfoArray.priorityInfo];
          
          kiprisResponse.body.item.priorityInfo = priorityInfos.map(priority => ({
            priorityApplicationCountry: priority.priorityApplicationCountry || '',
            priorityApplicationNumber: priority.priorityApplicationNumber || '',
            priorityApplicationDate: priority.priorityApplicationDate || ''
          }));
        }
        
        // 9. 패밀리정보 처리
        if (itemData.familyInfoArray && itemData.familyInfoArray.familyInfo) {
          const familyInfos = Array.isArray(itemData.familyInfoArray.familyInfo) 
            ? itemData.familyInfoArray.familyInfo 
            : [itemData.familyInfoArray.familyInfo];
          
          kiprisResponse.body.item.familyInfo = familyInfos.map(family => ({
            familyApplicationNumber: family.familyApplicationNumber || ''
          }));
        }
        
        // 10. 국제출원정보 처리
        if (itemData.internationalInfoArray && itemData.internationalInfoArray.internationalInfo) {
          const internationalInfos = Array.isArray(itemData.internationalInfoArray.internationalInfo) 
            ? itemData.internationalInfoArray.internationalInfo 
            : [itemData.internationalInfoArray.internationalInfo];
          
          kiprisResponse.body.item.internationalInfo = internationalInfos.map(international => ({
            internationOpenDate: international.internationOpenDate || '',
            internationOpenNumber: international.internationOpenNumber || '',
            internationalApplicationDate: international.internationalApplicationDate || '',
            internationalApplicationNumber: international.internationalApplicationNumber || ''
          }));
        }
        
        // 11. 지정국정보 처리
        if (itemData.designatedStateInfoArray && itemData.designatedStateInfoArray.designatedStateInfo) {
          const designatedStateInfos = Array.isArray(itemData.designatedStateInfoArray.designatedStateInfo) 
            ? itemData.designatedStateInfoArray.designatedStateInfo 
            : [itemData.designatedStateInfoArray.designatedStateInfo];
          
          kiprisResponse.body.item.designatedStateInfo = designatedStateInfos.map(state => ({
            kind: state.kind || '',
            country: state.country || ''
          }));
        }
        
        // 12. 선행기술조사문헌정보 처리
        if (itemData.priorArtDocumentsInfoArray && itemData.priorArtDocumentsInfoArray.priorArtDocumentsInfo) {
          const priorArtInfos = Array.isArray(itemData.priorArtDocumentsInfoArray.priorArtDocumentsInfo) 
            ? itemData.priorArtDocumentsInfoArray.priorArtDocumentsInfo 
            : [itemData.priorArtDocumentsInfoArray.priorArtDocumentsInfo];
          
          kiprisResponse.body.item.priorArtDocumentsInfo = priorArtInfos.map(priorArt => ({
            documentsNumber: priorArt.documentsNumber || '',
            examinerQuotationFlag: priorArt.examinerQuotationFlag || ''
          }));
        }
        
        // 13. 행정처리정보 처리
        if (itemData.legalStatusInfoArray && itemData.legalStatusInfoArray.legalStatusInfo) {
          const legalStatusInfos = Array.isArray(itemData.legalStatusInfoArray.legalStatusInfo) 
            ? itemData.legalStatusInfoArray.legalStatusInfo 
            : [itemData.legalStatusInfoArray.legalStatusInfo];
          
          kiprisResponse.body.item.legalStatusInfo = legalStatusInfos.map(legal => ({
            commonCodeName: legal.commonCodeName || '',
            documentEngName: legal.documentEngName || '',
            documentName: legal.documentName || '',
            receiptDate: legal.receiptDate || '',
            receiptNumber: legal.receiptNumber || ''
          }));
        }
        
        // 14. 이미지경로정보 처리
        if (itemData.imagePathInfo) {
          kiprisResponse.body.item.imagePathInfo = {
            docName: itemData.imagePathInfo.docName || '',
            largePath: itemData.imagePathInfo.largePath || '',
            path: itemData.imagePathInfo.path || ''
          };
        }
        
        // 15. 국가연구개발사업정보 처리
        if (itemData.rndInfoArray && itemData.rndInfoArray.rndInfo) {
          const rndInfos = Array.isArray(itemData.rndInfoArray.rndInfo) 
            ? itemData.rndInfoArray.rndInfo 
            : [itemData.rndInfoArray.rndInfo];
          
          kiprisResponse.body.item.rndInfo = rndInfos.map(rnd => ({
            rndDepartmentName: rnd.rndDepartmentName || '',
            rndDuration: rnd.rndDuration || '',
            rndManagingInstituteName: rnd.rndManagingInstituteName || '',
            rndProjectName: rnd.rndProjectName || '',
            rndSpecialInstituteName: rnd.rndSpecialInstituteName || '',
            rndTaskContribution: rnd.rndTaskContribution || '',
            rndTaskName: rnd.rndTaskName || '',
            rndTaskNumber: rnd.rndTaskNumber || ''
          }));
        }
      }
    }
    
    // API 키 검증 실패 처리
    if (kiprisResponse.header.resultCode === '10') {
      console.error('❌ KIPRIS API 키 검증 실패:', kiprisResponse.header.resultMsg);
      return res.status(401).json({
        success: false,
        error: 'API key validation failed',
        message: kiprisResponse.header.resultMsg,
        code: kiprisResponse.header.resultCode
      });
    }
    
    // 기타 API 오류 처리
    if (kiprisResponse.header.successYN !== 'Y' || kiprisResponse.header.resultCode !== '00') {
      console.error('❌ KIPRIS API 오류:', kiprisResponse.header);
      return res.status(400).json({
        success: false,
        error: 'KIPRIS API error',
        message: kiprisResponse.header.resultMsg,
        code: kiprisResponse.header.resultCode
      });
    }
    
    console.log('🎯 최종 KIPRIS API 상세정보 응답:', {
      success: kiprisResponse.header.successYN === 'Y',
      resultCode: kiprisResponse.header.resultCode,
      resultMsg: kiprisResponse.header.resultMsg,
      hasData: !!kiprisResponse.body.item.biblioSummaryInfo
    });
    
    return res.status(200).json({
      success: true,
      data: kiprisResponse
    });
    
  } catch (error) {
    console.error('❌ KIPRIS API Detail Error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status
    });
    
    // 에러 타입에 따른 메시지 처리
    let errorMessage = 'KIPRIS API 상세정보 호출 중 오류가 발생했습니다.';
    let errorCode = 'UNKNOWN_ERROR';
    
    if (error.code === 'ECONNABORTED') {
      errorMessage = 'KIPRIS API 응답 시간이 초과되었습니다.';
      errorCode = 'TIMEOUT_ERROR';
    } else if (error.response) {
      errorMessage = `KIPRIS API 오류: ${error.response.status} ${error.response.statusText}`;
      errorCode = 'API_RESPONSE_ERROR';
    } else if (error.request) {
      errorMessage = 'KIPRIS API 서버에 연결할 수 없습니다.';
      errorCode = 'CONNECTION_ERROR';
    }

    return res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message,
      errorCode: errorCode
    });
  }
};