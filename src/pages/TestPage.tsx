import React from 'react';

const TestPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">테스트 페이지</h1>
        <p className="text-gray-600">이 페이지가 보이면 라우팅이 정상적으로 작동하고 있습니다.</p>
        <div className="mt-4">
          <p className="text-sm text-gray-500">현재 시간: {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default TestPage;