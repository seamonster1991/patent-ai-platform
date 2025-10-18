import React, { useState } from 'react';
import { Send, MessageSquare, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/UI/Card';
import { Button } from '../components/UI/Button';

const Feedback: React.FC = () => {
  const { user, profile } = useAuthStore();
  const [formData, setFormData] = useState({
    email: user?.email || '',
    category: 'general',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const categories = [
    { value: 'general', label: '일반 문의' },
    { value: 'bug', label: '버그 신고' },
    { value: 'feature', label: '기능 제안' },
    { value: 'improvement', label: '개선 사항' },
    { value: 'payment', label: '결제 문의' },
    { value: 'technical', label: '기술 지원' }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject.trim() || !formData.message.trim()) {
      setErrorMessage('제목과 메시지를 모두 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          userId: user?.id,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        setSubmitStatus('success');
        setFormData({
          email: user?.email || '',
          category: 'general',
          subject: '',
          message: ''
        });
      } else {
        const errorData = await response.json();
        setErrorMessage(errorData.message || '피드백 전송에 실패했습니다.');
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Feedback submission error:', error);
      setErrorMessage('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-ms-soft via-white to-ms-accent/10 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-ms-olive rounded-full flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-ms-primary mb-2">Feedback</h1>
          <p className="text-lg text-ms-secondary max-w-2xl mx-auto">
            Patent AI 서비스에 대한 의견이나 제안사항을 보내주세요. 
            여러분의 소중한 피드백이 더 나은 서비스를 만드는 데 도움이 됩니다.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Feedback Form */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <CardTitle className="text-xl font-semibold text-ms-primary flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  피드백 보내기
                </CardTitle>
              </CardHeader>
              <CardContent>
                {submitStatus === 'success' && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-green-800 font-medium">피드백이 성공적으로 전송되었습니다!</p>
                      <p className="text-green-600 text-sm">빠른 시일 내에 검토 후 답변드리겠습니다.</p>
                    </div>
                  </div>
                )}

                {errorMessage && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <p className="text-red-800">{errorMessage}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-ms-text mb-2">
                      이메일
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-ms-muted" />
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-3 border border-ms-line rounded-lg focus:ring-2 focus:ring-ms-olive focus:border-transparent transition-all"
                        placeholder="이메일을 입력하세요"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-ms-text mb-2">
                      카테고리
                    </label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-ms-line rounded-lg focus:ring-2 focus:ring-ms-olive focus:border-transparent transition-all"
                    >
                      {categories.map(category => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-ms-text mb-2">
                      제목
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-ms-line rounded-lg focus:ring-2 focus:ring-ms-olive focus:border-transparent transition-all"
                      placeholder="피드백 제목을 입력하세요"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-ms-text mb-2">
                      메시지
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      rows={6}
                      className="w-full px-4 py-3 border border-ms-line rounded-lg focus:ring-2 focus:ring-ms-olive focus:border-transparent transition-all resize-none"
                      placeholder="자세한 피드백 내용을 입력해주세요..."
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-ms-olive hover:bg-ms-olive/90 text-white py-3 px-6 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        전송 중...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        피드백 전송
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Info Sidebar */}
          <div className="space-y-6">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-ms-primary">
                  피드백 가이드
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-ms-olive rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-ms-text">버그 신고</h4>
                      <p className="text-sm text-ms-secondary">발견한 오류나 문제점을 상세히 설명해주세요.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-ms-olive rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-ms-text">기능 제안</h4>
                      <p className="text-sm text-ms-secondary">새로운 기능이나 개선 아이디어를 제안해주세요.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-ms-olive rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-ms-text">일반 문의</h4>
                      <p className="text-sm text-ms-secondary">서비스 이용 관련 질문이나 의견을 보내주세요.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 bg-ms-olive/5 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="text-center">
                  <h3 className="font-semibold text-ms-primary mb-2">빠른 응답</h3>
                  <p className="text-sm text-ms-secondary">
                    일반적으로 1-2 영업일 내에 답변드립니다. 
                    긴급한 문의사항은 기술 지원 카테고리를 선택해주세요.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Feedback;