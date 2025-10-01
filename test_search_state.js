// 검색 상태 저장/복원 기능 테스트 스크립트
// 브라우저 콘솔에서 실행할 수 있습니다.

// 테스트용 검색 상태 데이터
const testSearchState = {
  filters: {
    word: "테스트 검색어",
    inventionTitle: "",
    astrtCont: "",
    pageNo: 1,
    numOfRows: 30,
    sortSpec: "AD",
    descSort: true,
    patent: true,
    utility: true
  },
  results: [
    {
      indexNo: "1",
      registerStatus: "등록",
      inventionTitle: "테스트 특허 1",
      ipcNumber: "G06F 17/30",
      registerNumber: "10-1234567",
      registerDate: "2023-01-01",
      applicationNumber: "10-2022-0123456",
      applicationDate: "2022-01-01",
      openNumber: "10-2023-0123456",
      openDate: "2023-06-01",
      publicationNumber: "10-2023-0123456",
      publicationDate: "2023-12-01",
      astrtCont: "이것은 테스트용 특허 초록입니다.",
      drawing: "",
      bigDrawing: "",
      applicantName: "테스트 회사"
    },
    {
      indexNo: "2",
      registerStatus: "공개",
      inventionTitle: "테스트 특허 2",
      ipcNumber: "H04L 29/06",
      registerNumber: "",
      registerDate: "",
      applicationNumber: "10-2022-0123457",
      applicationDate: "2022-02-01",
      openNumber: "10-2023-0123457",
      openDate: "2023-07-01",
      publicationNumber: "",
      publicationDate: "",
      astrtCont: "이것은 두 번째 테스트용 특허 초록입니다.",
      drawing: "",
      bigDrawing: "",
      applicantName: "테스트 회사 2"
    }
  ],
  totalCount: 2,
  currentPage: 1,
  timestamp: Date.now()
};

// localStorage에 테스트 데이터 저장
function saveTestSearchState() {
  try {
    localStorage.setItem('patent_search_state', JSON.stringify(testSearchState));
    console.log('✅ 테스트 검색 상태가 저장되었습니다.');
    console.log('저장된 데이터:', testSearchState);
  } catch (error) {
    console.error('❌ 검색 상태 저장 실패:', error);
  }
}

// localStorage에서 검색 상태 로드
function loadTestSearchState() {
  try {
    const savedState = localStorage.getItem('patent_search_state');
    if (savedState) {
      const searchState = JSON.parse(savedState);
      console.log('✅ 저장된 검색 상태를 불러왔습니다.');
      console.log('불러온 데이터:', searchState);
      return searchState;
    } else {
      console.log('⚠️ 저장된 검색 상태가 없습니다.');
      return null;
    }
  } catch (error) {
    console.error('❌ 검색 상태 로드 실패:', error);
    return null;
  }
}

// localStorage에서 검색 상태 삭제
function clearTestSearchState() {
  try {
    localStorage.removeItem('patent_search_state');
    console.log('✅ 저장된 검색 상태가 삭제되었습니다.');
  } catch (error) {
    console.error('❌ 검색 상태 삭제 실패:', error);
  }
}

// 테스트 실행
console.log('🧪 검색 상태 저장/복원 기능 테스트 시작');
console.log('');
console.log('사용 가능한 함수:');
console.log('- saveTestSearchState(): 테스트 데이터 저장');
console.log('- loadTestSearchState(): 저장된 데이터 로드');
console.log('- clearTestSearchState(): 저장된 데이터 삭제');
console.log('');
console.log('테스트 순서:');
console.log('1. saveTestSearchState() 실행');
console.log('2. 페이지 새로고침');
console.log('3. 검색 페이지에서 저장된 상태가 복원되는지 확인');
console.log('4. 상세보기 페이지로 이동');
console.log('5. "검색으로 돌아가기" 버튼 클릭');
console.log('6. 이전 검색 결과가 유지되는지 확인');