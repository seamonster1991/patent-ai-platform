import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { ChartOptions } from 'chart.js';

// IPC/CPC 코드를 자연어로 변환하는 강화된 매핑 함수
const convertToNaturalLanguage = (code: string): string => {
  const ipcMapping: { [key: string]: string } = {
    // A 섹션 - 생활필수품
    'A01': '농업, 임업, 축산업',
    'A21': '제빵, 제과',
    'A22': '도축, 육류가공',
    'A23': '식품, 음료',
    'A24': '담배',
    'A41': '의류',
    'A42': '모자류',
    'A43': '신발류',
    'A44': '재봉용품',
    'A45': '장신구',
    'A46': '가죽제품',
    'A47': '가구, 가정용품',
    'A61': '의학, 치과학, 수의학',
    'A62': '구명, 소방',
    'A63': '스포츠, 게임, 오락',
    
    // B 섹션 - 처리조작, 운수
    'B01': '물리적, 화학적 처리',
    'B02': '파쇄, 분쇄',
    'B03': '액체분리, 선별',
    'B04': '원심분리',
    'B05': '분무, 무화',
    'B06': '기계적 진동',
    'B07': '고체분리',
    'B08': '청소',
    'B09': '고체폐기물 처리',
    'B21': '기계적 금속가공',
    'B22': '주조, 분말야금',
    'B23': '공작기계',
    'B24': '연삭, 연마',
    'B25': '수공구, 휴대용 동력공구',
    'B26': '절단공구',
    'B27': '목재가공',
    'B28': '시멘트, 점토 가공',
    'B29': '플라스틱 가공',
    'B30': '프레스',
    'B31': '종이제품 제조',
    'B32': '적층제품',
    'B41': '인쇄',
    'B42': '제본',
    'B43': '필기용구',
    'B44': '장식기술',
    'B60': '차량일반',
    'B61': '철도',
    'B62': '무궤도차량',
    'B63': '선박',
    'B64': '항공기',
    'B65': '운반, 포장, 저장',
    'B66': '권상, 승강',
    'B67': '병, 항아리 개폐',
    'B68': '안장',
    'B81': '마이크로구조기술',
    'B82': '나노기술',
    
    // C 섹션 - 화학, 야금
    'C01': '무기화학',
    'C02': '수처리',
    'C03': '유리',
    'C04': '시멘트',
    'C05': '비료',
    'C06': '폭발물',
    'C07': '유기화학',
    'C08': '고분자화합물',
    'C09': '염료, 페인트',
    'C10': '석유, 가스',
    'C11': '동물성, 식물성 유지',
    'C12': '생화학, 미생물학',
    'C13': '설탕공업',
    'C14': '원피, 가죽',
    'C21': '철야금',
    'C22': '야금',
    'C23': '금속피복',
    'C25': '전기분해',
    'C30': '결정성장',
    'C40': '조합기술',
    
    // D 섹션 - 섬유, 지류
    'D01': '천연, 인조 섬유',
    'D02': '실',
    'D03': '직조',
    'D04': '조끈, 끈',
    'D05': '재봉, 자수',
    'D06': '섬유처리',
    'D07': '로프',
    'D21': '제지',
    
    // E 섹션 - 고정구조물
    'E01': '도로, 철도, 교량 건설',
    'E02': '수공학',
    'E03': '급수, 하수도',
    'E04': '건축',
    'E05': '자물쇠, 열쇠',
    'E06': '문, 창, 셔터',
    'E21': '지중굴착',
    
    // F 섹션 - 기계공학
    'F01': '기관, 펌프',
    'F02': '연소기관',
    'F03': '액체기계',
    'F04': '액체기계',
    'F15': '유체압 액추에이터',
    'F16': '기계요소',
    'F17': '가스저장',
    'F21': '조명',
    'F22': '증기발생',
    'F23': '연소장치',
    'F24': '가열',
    'F25': '냉동기계',
    'F26': '건조',
    'F27': '노',
    'F28': '열교환',
    'F41': '무기',
    'F42': '탄약, 폭파',
    
    // G 섹션 - 물리학
    'G01': '측정',
    'G02': '광학',
    'G03': '사진술',
    'G04': '시계',
    'G05': '제어, 조절',
    'G06': '계산, 컴퓨팅',
    'G07': '검사장치',
    'G08': '신호',
    'G09': '교육',
    'G10': '악기',
    'G11': '정보저장',
    'G12': '기기세부',
    'G16': '정보통신기술',
    'G21': '핵물리학',
    
    // H 섹션 - 전기
    'H01': '기본전기소자',
    'H02': '전력발생, 변환, 배전',
    'H03': '기본전자회로',
    'H04': '전기통신기술',
    'H05': '기타 전기기술',
    'H10': '반도체장치',
  };

  // 코드에서 처음 3자리 추출 (예: A01B001 -> A01)
  const mainCode = code.substring(0, 3);
  
  // 매핑된 자연어가 있으면 반환, 없으면 원본 코드 반환
  return ipcMapping[mainCode] || code;
};

interface FieldData {
  label: string;
  value: number;
  percentage: string;
}

interface FieldAnalysisDonutChartProps {
  data: FieldData[];
  title: string;
  category: 'search' | 'report';
}

const FieldAnalysisDonutChart: React.FC<FieldAnalysisDonutChartProps> = ({ 
  data, 
  title, 
  category 
}) => {
  // 데이터를 자연어로 변환
  const processedData = data.map(item => ({
    ...item,
    naturalLabel: convertToNaturalLanguage(item.label),
    originalLabel: item.label
  }));

  // 색상 팔레트 정의 (10개 이상)
  const colors = [
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Violet
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
    '#EC4899', // Pink
    '#6B7280', // Gray
    '#14B8A6', // Teal
    '#F472B6', // Pink-400
    '#A78BFA', // Violet-400
    '#34D399', // Emerald-400
    '#FBBF24', // Amber-400
  ];

  const chartData = {
    labels: processedData.map(item => item.naturalLabel),
    datasets: [
      {
        data: processedData.map(item => item.value),
        backgroundColor: colors.slice(0, processedData.length),
        borderColor: colors.slice(0, processedData.length).map(color => color),
        borderWidth: 2,
        hoverBorderWidth: 3,
        hoverOffset: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: false, // 제목을 별도 컴포넌트로 분리
      },
      legend: {
        display: false, // 커스텀 범례 사용
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#374151',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed;
            const percentage = processedData[context.dataIndex]?.percentage || '0';
            return `${label}: ${value.toLocaleString()} (${percentage}%)`;
          }
        }
      },
    },
    cutout: '60%', // 도넛 모양을 위한 중앙 구멍 크기
    elements: {
      arc: {
        borderRadius: 4,
      },
    },
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      {/* 제목 영역 */}
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">
          {title}
        </h3>
      </div>
      
      <div className="relative">
        {/* 차트 영역 */}
        <div className="h-[500px] relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div style={{ width: '300px', height: '300px', position: 'relative' }}>
              <Doughnut data={chartData} options={options} />
              {/* 중앙 텍스트 */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800">
                    {processedData.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">
                    총 {category === 'search' ? '검색' : '리포트'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SVG 오버레이 - 연결선과 자연어 라벨 */}
          <svg 
            className="absolute inset-0 pointer-events-none" 
            width="100%" 
            height="100%" 
            viewBox="0 0 500 500"
          >
            {/* 연결선과 자연어 라벨 - 상위 10개 항목 표시 */}
            {processedData.slice(0, 10).map((item, index) => {
              // 각 세그먼트의 실제 각도 계산 (데이터 비율에 따라)
              const totalValue = processedData.reduce((sum, d) => sum + d.value, 0);
              
              // 현재 항목까지의 누적 각도 계산
              let cumulativeAngle = 0;
              for (let i = 0; i < index; i++) {
                cumulativeAngle += (processedData[i].value / totalValue) * 360;
              }
              
              // 현재 세그먼트의 중앙 각도 계산
              const segmentAngle = (item.value / totalValue) * 360;
              const midAngle = cumulativeAngle + (segmentAngle / 2) - 90; // -90도로 12시 방향부터 시작
              
              const centerX = 250; // SVG 중심 X
              const centerY = 250; // SVG 중심 Y
              const innerRadius = 90; // 도넛 차트 외곽에서 시작
              const midRadius = 130; // 중간 지점
              const outerRadius = 180; // 라벨까지의 거리
              
              // 연결선 시작점 (도넛 차트 외곽)
              const startX = centerX + Math.cos((midAngle * Math.PI) / 180) * innerRadius;
              const startY = centerY + Math.sin((midAngle * Math.PI) / 180) * innerRadius;
              
              // 연결선 중간점
              const midX = centerX + Math.cos((midAngle * Math.PI) / 180) * midRadius;
              const midY = centerY + Math.sin((midAngle * Math.PI) / 180) * midRadius;
              
              // 라벨 위치 계산 (스마트 배치로 겹침 방지)
              const baseRadius = outerRadius + 30;
              
              // 각도를 8개 구역으로 나누어 라벨 배치 최적화
              const sectorAngle = (360 / 10) * index - 90; // 10개 항목을 균등 배치
              const adjustedAngle = sectorAngle;
              
              const labelX = centerX + Math.cos((adjustedAngle * Math.PI) / 180) * baseRadius;
              const labelY = centerY + Math.sin((adjustedAngle * Math.PI) / 180) * baseRadius;
              
              // 연결선 끝점 (라벨 방향으로)
              const endX = centerX + Math.cos((adjustedAngle * Math.PI) / 180) * (baseRadius - 20);
              const endY = centerY + Math.sin((adjustedAngle * Math.PI) / 180) * (baseRadius - 20);
              
              // 라벨 텍스트 정렬 계산
              const isRightSide = adjustedAngle > -90 && adjustedAngle < 90;
              const textAnchor = isRightSide ? 'start' : 'end';
              const labelOffsetX = isRightSide ? 10 : -10;
            
              return (
                <g key={item.originalLabel}>
                  {/* 연결선 - 세그먼트에서 라벨로 */}
                  <path
                    d={`M ${startX} ${startY} L ${midX} ${midY} L ${endX} ${endY}`}
                    stroke={colors[index]}
                    strokeWidth="2.5"
                    fill="none"
                    className="pointer-events-none"
                  />
                  
                  {/* 연결점 (세그먼트 끝) */}
                  <circle
                    cx={startX}
                    cy={startY}
                    r="4"
                    fill={colors[index]}
                    className="pointer-events-none"
                  />
                  
                  {/* 연결점 (라벨 시작) */}
                  <circle
                    cx={endX}
                    cy={endY}
                    r="3"
                    fill={colors[index]}
                    className="pointer-events-none"
                  />
                  
                  {/* 자연어 라벨 배경 */}
                  <rect
                    x={labelX + labelOffsetX - (isRightSide ? 0 : 120)}
                    y={labelY - 15}
                    width="120"
                    height="30"
                    fill="rgba(255, 255, 255, 0.95)"
                    stroke={colors[index]}
                    strokeWidth="1"
                    rx="4"
                    className="pointer-events-none"
                  />
                  
                  {/* 자연어 라벨 */}
                  <text
                    x={labelX + labelOffsetX + (isRightSide ? 60 : -60)}
                    y={labelY - 2}
                    textAnchor="middle"
                    className="text-xs font-semibold"
                    style={{ fontSize: '11px', fill: '#1F2937' }}
                  >
                    {item.naturalLabel.length > 12 ? 
                      item.naturalLabel.substring(0, 12) + '...' : 
                      item.naturalLabel}
                  </text>
                  
                  {/* 퍼센티지 라벨 */}
                  <text
                    x={labelX + labelOffsetX + (isRightSide ? 60 : -60)}
                    y={labelY + 10}
                    textAnchor="middle"
                    className="text-xs font-medium"
                    style={{ fontSize: '10px' }}
                    fill={colors[index]}
                  >
                    {item.percentage}% ({item.value.toLocaleString()})
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* 간단한 요약 정보만 하단에 표시 */}
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-4 px-4 py-2 bg-gray-50 rounded-lg">
            <ArrowRightIcon className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">
              분야 분석 데이터 사용 가능
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-2">
             상위 {Math.min(data.length, 10)}개 분야 표시 중
           </div>
        </div>
      </div>
    </div>
  );
};

export default FieldAnalysisDonutChart;