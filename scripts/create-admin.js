import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdminUser() {
  try {
    // 먼저 admin_roles 테이블에 기본 역할이 있는지 확인
    const { data: roles, error: rolesError } = await supabase
      .from('admin_roles')
      .select('*')
      .eq('name', 'super_admin');

    let roleId;
    if (rolesError || !roles || roles.length === 0) {
      // 기본 관리자 역할 생성
      const { data: newRole, error: createRoleError } = await supabase
        .from('admin_roles')
        .insert({
          name: 'super_admin',
          description: 'Super Administrator',
          permissions: ['all']
        })
        .select()
        .single();

      if (createRoleError) {
        console.error('Error creating admin role:', createRoleError);
        return;
      }
      roleId = newRole.id;
      console.log('✅ Created admin role:', newRole);
    } else {
      roleId = roles[0].id;
      console.log('✅ Found existing admin role:', roles[0]);
    }

    // 관리자 계정 생성
    const email = 'admin@test.com';
    const password = 'admin123';
    const passwordHash = await bcrypt.hash(password, 10);

    const { data: admin, error: adminError } = await supabase
      .from('admin_users')
      .insert({
        email: email,
        password_hash: passwordHash,
        name: 'Test Admin',
        role_id: roleId,
        is_active: true
      })
      .select()
      .single();

    if (adminError) {
      if (adminError.code === '23505') {
        console.log('⚠️ Admin user already exists');
        return;
      }
      console.error('Error creating admin user:', adminError);
      return;
    }

    console.log('✅ Created admin user:', {
      id: admin.id,
      email: admin.email,
      name: admin.name
    });

    console.log('\n🎉 Admin account created successfully!');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('\nYou can now login to the admin dashboard.');

  } catch (error) {
    console.error('Error:', error);
  }
}

createAdminUser();