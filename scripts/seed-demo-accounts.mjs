/**
 * Seed script: creates demo accounts for all 4 roles.
 *
 * Usage:  node scripts/seed-demo-accounts.mjs
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * in .env at the project root.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse .env manually (no dotenv dependency needed)
const envFile = readFileSync(resolve(__dirname, '..', '.env'), 'utf-8');
for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_PASSWORD = 'Demo@1234';

const DEMO_USERS = [
    { email: 'admin@learngrow.demo', fullName: 'Admin User', role: 'admin' },
    { email: 'teacher@learngrow.demo', fullName: 'Ms. Johnson', role: 'teacher' },
    { email: 'student@learngrow.demo', fullName: 'Alex Student', role: 'student' },
    { email: 'parent@learngrow.demo', fullName: 'Pat Parent', role: 'parent' },
];

async function upsertUser({ email, fullName, role }) {
    // Try creating auth user first
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: fullName, role },
    });

    let userId;

    if (authError) {
        // User already exists — find them via admin API
        const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const existing = listData?.users?.find((u) => u.email === email);
        if (!existing) {
            console.error(`  ❌ ${role.padEnd(8)} ${email} — ${authError.message} (and cannot find existing user)`);
            return null;
        }
        userId = existing.id;
        console.log(`  ⏭️  ${role.padEnd(8)} ${email} — already exists (${userId})`);
    } else {
        userId = authData.user.id;
        console.log(`  ✅ ${role.padEnd(8)} ${email} — created (${userId})`);
    }

    // Ensure profile exists with correct role
    await supabase.from('profiles').upsert({
        id: userId,
        email,
        full_name: fullName,
        role,
    });

    return userId;
}

async function seedClass(teacherId) {
    // Check for existing demo class
    const { data: existing } = await supabase
        .from('classes')
        .select('id, join_code')
        .eq('teacher_id', teacherId)
        .eq('name', 'Pre-Algebra Demo')
        .maybeSingle();

    if (existing) {
        console.log(`  ⏭️  Class "Pre-Algebra Demo" already exists (code: ${existing.join_code})`);
        return { classId: existing.id, joinCode: existing.join_code };
    }

    // Find or create a template course using SQL to bypass schema cache
    const { data: courseRows, error: sqlErr } = await supabase.rpc('exec_sql', {
        query: `
            INSERT INTO public.courses (teacher_id, title, description, published, is_template)
            VALUES ('${teacherId}', 'Pre-Algebra Foundations', 'Beginner course for integers, fractions, decimals, and ratios.', true, true)
            ON CONFLICT DO NOTHING
            RETURNING id
        `,
    });

    let courseId;

    if (sqlErr || !courseRows?.length) {
        // rpc might not exist — try direct table insert as fallback
        console.log('  ℹ️  Trying direct course lookup/insert...');
        const { data: existingCourse } = await supabase
            .from('courses')
            .select('id')
            .eq('teacher_id', teacherId)
            .limit(1)
            .maybeSingle();

        if (existingCourse) {
            courseId = existingCourse.id;
        } else {
            // Last resort: insert without is_template (base schema only)
            const { data: newCourse, error: insertErr } = await supabase
                .from('courses')
                .insert({
                    teacher_id: teacherId,
                    title: 'Pre-Algebra Foundations',
                    description: 'Beginner course for integers, fractions, decimals, and ratios.',
                    published: true,
                })
                .select('id')
                .single();

            if (insertErr) {
                console.error('  ❌ Course creation failed:', insertErr.message);
                console.log('  ℹ️  Attempting without the course — creating class with dummy course...');
                return null;
            }
            courseId = newCourse.id;
        }
    } else {
        courseId = courseRows[0].id;
    }

    console.log(`  ✅ Course ready (${courseId})`);

    // Generate join code
    const joinCode = 'DEMO' + Math.random().toString(36).substring(2, 4).toUpperCase();

    const { data: cls, error: clsErr } = await supabase
        .from('classes')
        .insert({
            teacher_id: teacherId,
            course_id: courseId,
            name: 'Pre-Algebra Demo',
            join_code: joinCode,
        })
        .select('id, join_code')
        .single();

    if (clsErr) {
        console.error('  ❌ Class creation failed:', clsErr.message);
        return null;
    }

    console.log(`  ✅ Class "Pre-Algebra Demo" created (code: ${cls.join_code})`);
    return { classId: cls.id, joinCode: cls.join_code };
}

async function enrollStudent(studentId, classId) {
    const { data: existing } = await supabase
        .from('class_enrollments')
        .select('id')
        .eq('student_id', studentId)
        .eq('class_id', classId)
        .maybeSingle();

    if (existing) {
        console.log('  ⏭️  Student already enrolled');
        return;
    }

    await supabase.from('class_enrollments').insert({
        student_id: studentId,
        class_id: classId,
    });
    console.log('  ✅ Student enrolled in demo class');
}

async function linkGuardian(parentId, studentId) {
    const { data: existing } = await supabase
        .from('student_guardians')
        .select('id')
        .eq('guardian_id', parentId)
        .eq('student_id', studentId)
        .maybeSingle();

    if (existing) {
        console.log('  ⏭️  Guardian already linked');
        return;
    }

    await supabase.from('student_guardians').insert({
        guardian_id: parentId,
        student_id: studentId,
    });
    console.log('  ✅ Parent linked to student');
}

async function main() {
    console.log('\n🌱 Seeding Learn-nGrow demo accounts...\n');

    const ids = {};
    for (const user of DEMO_USERS) {
        ids[user.role] = await upsertUser(user);
    }

    if (!ids.teacher || !ids.student || !ids.parent) {
        console.error('\n❌ Could not create all required users. Aborting.\n');
        process.exit(1);
    }

    console.log('\n📚 Setting up demo class...\n');
    const classResult = await seedClass(ids.teacher);

    if (classResult) {
        console.log('\n🔗 Setting up relationships...\n');
        await enrollStudent(ids.student, classResult.classId);
        await linkGuardian(ids.parent, ids.student);
    } else {
        console.log('\n⚠️  Skipping class enrollment (class creation failed).');
        console.log('    You can create the class manually via the teacher dashboard.\n');
        console.log('🔗 Setting up guardian link...\n');
        await linkGuardian(ids.parent, ids.student);
    }

    console.log('\n' + '═'.repeat(55));
    console.log('  🎉 Demo accounts ready!');
    console.log('═'.repeat(55));
    console.log(`
  All accounts use password: ${DEMO_PASSWORD}

  ┌──────────┬────────────────────────────┐
  │ Role     │ Email                      │
  ├──────────┼────────────────────────────┤
  │ Admin    │ admin@learngrow.demo       │
  │ Teacher  │ teacher@learngrow.demo     │
  │ Student  │ student@learngrow.demo     │
  │ Parent   │ parent@learngrow.demo      │
  └──────────┴────────────────────────────┘
`);
}

main().catch(console.error);
