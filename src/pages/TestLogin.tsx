import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'

export default function TestLogin() {
  const [email, setEmail] = useState('demo@example.com')
  const [password, setPassword] = useState('demo123456')
  const [result, setResult] = useState('')
  
  const { signIn, user, loading, initialized, isAdmin, initialize } = useAuthStore()
  
  useEffect(() => {
    console.warn('🧪 [TestLogin] 컴포넌트 마운트됨')
    console.warn('🧪 [TestLogin] AuthStore 초기화 호출')
    initialize()
  }, [])

  const handleTest = async () => {
    console.warn('🧪 [TestLogin] 테스트 시작')
    setResult('테스트 중...')
    
    try {
      const loginResult = await signIn(email, password)
      console.warn('🧪 [TestLogin] 로그인 결과:', loginResult)
      
      if (loginResult.error) {
        setResult(`❌ 로그인 실패: ${loginResult.error}`)
      } else {
        setResult('✅ 로그인 성공!')
      }
    } catch (error) {
      console.error('🧪 [TestLogin] 예외:', error)
      setResult(`❌ 예외 발생: ${error}`)
    }
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🧪 로그인 테스트 페이지</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>AuthStore 상태:</h3>
        <pre>{JSON.stringify({ 
          hasUser: !!user, 
          userId: user?.id,
          email: user?.email,
          loading, 
          initialized, 
          isAdmin 
        }, null, 2)}</pre>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>로그인 테스트:</h3>
        <div>
          <label>이메일: </label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            style={{ margin: '5px', padding: '5px' }}
          />
        </div>
        <div>
          <label>비밀번호: </label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            style={{ margin: '5px', padding: '5px' }}
          />
        </div>
        <button 
          onClick={handleTest}
          style={{ margin: '10px', padding: '10px 20px' }}
        >
          로그인 테스트
        </button>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>결과:</h3>
        <pre style={{ background: '#f0f0f0', padding: '10px' }}>{result}</pre>
      </div>
    </div>
  )
}