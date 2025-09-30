// KIPRIS API 서지상세정보 응답 타입 정의

export interface BiblioSummaryInfo {
  applicationDate: string;
  applicationNumber: string;
  applicationFlag: string;
  claimCount: string;
  examinerName: string;
  finalDisposal: string;
  inventionTitle: string;
  inventionTitleEng: string;
  openDate: string;
  openNumber: string;
  originalApplicationDate: string;
  originalApplicationKind: string;
  originalApplicationNumber: string;
  originalExaminationRequestDate: string;
  originalExaminationRequestFlag: string;
  publicationDate: string;
  publicationNumber: string;
  registerDate: string;
  registerNumber: string;
  registerStatus: string;
  translationSubmitDate: string;
}

export interface IpcInfo {
  ipcDate: string;
  ipcNumber: string;
}

export interface FamilyInfo {
  familyApplicationNumber: string;
}

export interface AbstractInfo {
  astrtCont: string;
}

export interface InternationalInfo {
  internationOpenDate: string;
  internationOpenNumber: string;
  internationalApplicationDate: string;
  internationalApplicationNumber: string;
}

export interface ClaimInfo {
  claim: string;
}

export interface ApplicantInfo {
  address: string;
  code: string;
  country: string;
  engName: string;
  name: string;
}

export interface InventorInfo {
  address: string;
  code: string;
  country: string;
  engName: string;
  name: string;
}

export interface AgentInfo {
  address: string;
  code: string;
  country: string;
  engName: string;
  name: string;
}

export interface PriorityInfo {
  priorityApplicationCountry: string;
  priorityApplicationNumber: string;
  priorityApplicationDate: string;
}

export interface DesignatedStateInfo {
  kind: string;
  country: string;
}

export interface PriorArtDocumentsInfo {
  documentsNumber: string;
  examinerQuotationFlag: string;
}

export interface LegalStatusInfo {
  commonCodeName: string;
  documentEngName: string;
  documentName: string;
  receiptDate: string;
  receiptNumber: string;
}

export interface ImagePathInfo {
  docName: string;
  largePath: string;
  path: string;
}

export interface RndInfo {
  rndDepartmentName: string;
  rndDuration: string;
  rndManagingInstituteName: string;
  rndProjectName: string;
  rndSpecialInstituteName: string;
  rndTaskContribution: string;
  rndTaskName: string;
  rndTaskNumber: string;
}

export interface KiprisPatentDetail {
  biblioSummaryInfoArray: {
    biblioSummaryInfo: BiblioSummaryInfo;
  };
  ipcInfoArray: {
    ipcInfo: IpcInfo[];
  };
  familyInfoArray: {
    familyInfo: FamilyInfo[];
  };
  abstractInfoArray: {
    abstractInfo: AbstractInfo;
  };
  internationalInfoArray: {
    internationalInfo: InternationalInfo[];
  };
  claimInfoArray: {
    claimInfo: ClaimInfo[];
  };
  applicantInfoArray: {
    applicantInfo: ApplicantInfo[];
  };
  inventorInfoArray: {
    inventorInfo: InventorInfo[];
  };
  agentInfoArray: {
    agentInfo: AgentInfo[];
  };
  priorityInfoArray: {
    priorityInfo: PriorityInfo[];
  };
  designatedStateInfoArray: {
    designatedStateInfo: DesignatedStateInfo[];
  };
  priorArtDocumentsInfoArray: {
    priorArtDocumentsInfo: PriorArtDocumentsInfo[];
  };
  legalStatusInfoArray: {
    legalStatusInfo: LegalStatusInfo[];
  };
  imagePathInfo: ImagePathInfo;
  rndInfoArray: {
    rndInfo: RndInfo[];
  };
}

export interface KiprisDetailResponse {
  header: {
    requestMsgID: string;
    responseTime: string;
    responseMsgID: string;
    successYN: string;
    resultCode: string;
    resultMsg: string;
  };
  body: {
    item: KiprisPatentDetail;
  };
}

// AI 분석 리포트 관련 타입 정의
export interface MarketAnalysisReport {
  marketPenetration: string; // 시장 침투력
  competitiveLandscape: string; // 경쟁 구도
  marketGrowthDrivers: string; // 시장 성장 동력
  riskFactors: string; // 위험 요소
}

export interface BusinessInsightReport {
  revenueModel: string; // 수익 모델
  royaltyMargin: string; // 로열티 마진
  newBusinessOpportunities: string; // 신사업 기회
  competitorResponseStrategy: string; // 경쟁사 대응 전략
}

export interface AIAnalysisReport {
  applicationNumber: string;
  inventionTitle: string;
  marketAnalysis: MarketAnalysisReport;
  businessInsight: BusinessInsightReport;
  generatedAt: string;
  userId?: string;
}

export interface AIAnalysisResponse {
  success: boolean;
  data?: AIAnalysisReport;
  error?: string;
}

// KIPRIS 문서 다운로드 API 관련 인터페이스
export interface DocumentInfo {
  docName: string;
  path: string;
}

export interface DocumentResponse {
  header: {
    requestMsgID: string;
    responseTime: string;
    responseMsgID: string;
    successYN: string;
    resultCode: string;
    resultMsg: string;
  };
  body: {
    item: DocumentInfo;
  };
}

export interface DocumentDownloadRequest {
  applicationNumber: string;
  documentType: DocumentType;
}

export enum DocumentType {
  PUBLICATION_FULL_TEXT = 'getPubFullTextInfoSearch', // 공개전문PDF
  ANNOUNCEMENT_FULL_TEXT = 'getAnnFullTextInfoSearch', // 공고전문PDF
  CORRECTION_ANNOUNCEMENT = 'getCorrectionAnnouncementInfoSearch', // 정정공고PDF (폐기예정)
  REPRESENTATIVE_DRAWING = 'getRepresentativeDrawingInfoSearch', // 대표도면
  CORRECTION_ANNOUNCEMENT_V2 = 'getCorrectionAnnouncementV2InfoSearch', // 정정공고PDF_V2
  PUBLICATION_BOOKLET = 'getPublicationBookletInfoSearch', // 공개책자
  GAZETTE_BOOKLET = 'getGazetteBookletInfoSearch', // 공보책자
  ALL_DOCUMENTS_AVAILABILITY = 'getAllDocumentsAvailabilityInfoSearch', // 모든 전문 및 대표도 유무
  FULL_TEXT_FILE_INFO = 'getFullTextFileInfoSearch', // 전문파일정보
  STANDARDIZED_PUBLICATION_FULL_TEXT = 'getStandardizedPubFullTextInfoSearch', // 표준화 공개전문PDF
  STANDARDIZED_ANNOUNCEMENT_FULL_TEXT = 'getStandardizedAnnFullTextInfoSearch' // 표준화 공고전문PDF
}

export interface DocumentTypeInfo {
  type: DocumentType;
  name: string;
  description: string;
  deprecated?: boolean;
}

export const DOCUMENT_TYPES: DocumentTypeInfo[] = [
  {
    type: DocumentType.PUBLICATION_FULL_TEXT,
    name: '공개전문PDF',
    description: '특허 공개공보 전문 PDF 파일'
  },
  {
    type: DocumentType.ANNOUNCEMENT_FULL_TEXT,
    name: '공고전문PDF',
    description: '특허 공고공보 전문 PDF 파일'
  },
  {
    type: DocumentType.CORRECTION_ANNOUNCEMENT,
    name: '정정공고PDF',
    description: '정정공고 PDF 파일 (폐기예정)',
    deprecated: true
  },
  {
    type: DocumentType.REPRESENTATIVE_DRAWING,
    name: '대표도면',
    description: '특허의 대표 도면 이미지'
  },
  {
    type: DocumentType.CORRECTION_ANNOUNCEMENT_V2,
    name: '정정공고PDF V2',
    description: '정정공고 PDF 파일 (개선된 버전)'
  },
  {
    type: DocumentType.PUBLICATION_BOOKLET,
    name: '공개책자',
    description: '특허 공개공보 책자 형태 파일'
  },
  {
    type: DocumentType.GAZETTE_BOOKLET,
    name: '공보책자',
    description: '특허 공보 책자 형태 파일'
  },
  {
    type: DocumentType.ALL_DOCUMENTS_AVAILABILITY,
    name: '문서 가용성 정보',
    description: '모든 전문 및 대표도 유무 확인'
  },
  {
    type: DocumentType.FULL_TEXT_FILE_INFO,
    name: '전문파일정보',
    description: '전문 파일의 상세 정보'
  },
  {
    type: DocumentType.STANDARDIZED_PUBLICATION_FULL_TEXT,
    name: '표준화 공개전문PDF',
    description: '표준화된 공개전문 PDF 파일'
  },
  {
    type: DocumentType.STANDARDIZED_ANNOUNCEMENT_FULL_TEXT,
    name: '표준화 공고전문PDF',
    description: '표준화된 공고전문 PDF 파일'
  }
];

export interface DocumentDownloadResponse {
  success: boolean;
  data?: {
    documentInfo: DocumentInfo;
    downloadUrl: string;
  };
  error?: string;
}