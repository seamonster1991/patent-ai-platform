// Feedback API - 사용자 피드백 수집 및 관리자 알림
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// 환경 변수 검증
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 이메일 전송을 위한 Nodemailer 설정
const createEmailTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'noreply@patent-ai.com',
      pass: process.env.EMAIL_PASS || ''
    }
  });
};

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    return await handleSubmitFeedback(req, res);
  }

  if (req.method === 'GET') {
    return await handleGetFeedback(req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// 피드백 제출 처리
async function handleSubmitFeedback(req, res) {
  try {
    const { name, email, category, subject, message, userId, timestamp } = req.body;

    // 입력 검증
    if (!email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: '이메일, 제목, 메시지는 필수 입력 항목입니다.'
      });
    }

    if (!email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: '유효한 이메일 주소를 입력해주세요.'
      });
    }

    // 피드백 데이터 저장
    const feedbackData = {
      user_id: userId || null,
      name: name || '익명',
      email: email,
      category: category || 'general',
      subject: subject.trim(),
      message: message.trim(),
      status: 'pending',
      created_at: timestamp || new Date().toISOString(),
      ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      user_agent: req.headers['user-agent']
    };

    const { data: feedback, error: insertError } = await supabase
      .from('feedback_submissions')
      .insert([feedbackData])
      .select()
      .single();

    if (insertError) {
      console.error('Feedback insertion error:', insertError);
      return res.status(500).json({
        success: false,
        message: '피드백 저장 중 오류가 발생했습니다.'
      });
    }

    // 관리자에게 알림 전송 (선택사항)
    try {
      await notifyAdmins(feedback);
    } catch (notifyError) {
      console.error('Admin notification error:', notifyError);
      // 알림 실패는 피드백 제출 성공에 영향을 주지 않음
    }

    // 관리자 이메일로 피드백 전송
    try {
      await sendFeedbackEmail(feedback);
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // 이메일 전송 실패는 피드백 제출 성공에 영향을 주지 않음
    }

    return res.status(200).json({
      success: true,
      message: '피드백이 성공적으로 전송되었습니다.',
      feedbackId: feedback.id
    });

  } catch (error) {
    console.error('Feedback submission error:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
}

// 피드백 조회 (관리자용)
async function handleGetFeedback(req, res) {
  try {
    const { page = 1, limit = 20, status, category } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('feedback_submissions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data: feedbacks, error: queryError, count } = await query;

    if (queryError) {
      console.error('Feedback query error:', queryError);
      return res.status(500).json({
        success: false,
        message: '피드백 조회 중 오류가 발생했습니다.'
      });
    }

    return res.status(200).json({
      success: true,
      data: feedbacks,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total_count: count,
        total_pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Feedback retrieval error:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
}

// 관리자에게 알림 전송
// 관리자 이메일로 피드백 전송
async function sendFeedbackEmail(feedback) {
  try {
    const transporter = createEmailTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@patent-ai.com',
      to: 'dak240228@gmail.com',
      subject: `[Patent AI] 새로운 피드백: ${feedback.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
            새로운 피드백이 도착했습니다
          </h2>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #495057; margin-top: 0;">피드백 정보</h3>
            <p><strong>제목:</strong> ${feedback.subject}</p>
            <p><strong>카테고리:</strong> ${feedback.category}</p>
            <p><strong>보낸 사람:</strong> ${feedback.name}</p>
            <p><strong>이메일:</strong> ${feedback.email}</p>
            <p><strong>작성 시간:</strong> ${new Date(feedback.created_at).toLocaleString('ko-KR')}</p>
          </div>
          
          <div style="background-color: #ffffff; padding: 15px; border: 1px solid #dee2e6; border-radius: 5px;">
            <h3 style="color: #495057; margin-top: 0;">메시지 내용</h3>
            <p style="line-height: 1.6; white-space: pre-wrap;">${feedback.message}</p>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background-color: #e9ecef; border-radius: 5px; font-size: 12px; color: #6c757d;">
            <p>이 이메일은 Patent AI 시스템에서 자동으로 발송되었습니다.</p>
            <p>피드백 ID: ${feedback.id}</p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Feedback email sent successfully:', result.messageId);
    
  } catch (error) {
    console.error('Failed to send feedback email:', error);
    throw error;
  }
}

async function notifyAdmins(feedback) {
  try {
    // 관리자 목록 조회
    const { data: admins, error: adminError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('role', 'admin');

    if (adminError || !admins || admins.length === 0) {
      console.log('No admins found for notification');
      return;
    }

    // 각 관리자에게 알림 생성
    const notifications = admins.map(admin => ({
      user_id: admin.id,
      type: 'feedback_received',
      title: `새로운 피드백: ${feedback.subject}`,
      message: `${feedback.name}님이 ${feedback.category} 카테고리로 피드백을 보냈습니다.`,
      data: {
        feedback_id: feedback.id,
        category: feedback.category,
        sender_email: feedback.email
      },
      created_at: new Date().toISOString()
    }));

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notificationError) {
      console.error('Notification insertion error:', notificationError);
    } else {
      console.log(`Notifications sent to ${admins.length} admins`);
    }

  } catch (error) {
    console.error('Admin notification error:', error);
  }
}