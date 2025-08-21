import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

// Upload avatar and update user profile
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' }, 
        { status: 400 }
      );
    }

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(`avatars/${user.id}/${file.name}`, file, { upsert: true });

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload avatar', details: uploadError.message }, 
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(uploadData.path);
    const avatarUrl = urlData.publicUrl;

    // Update user metadata in users table
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating user avatar URL:', updateError);
      return NextResponse.json(
        { error: 'Failed to update avatar URL', details: updateError.message }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      avatar_url: avatarUrl,
      message: 'Avatar uploaded successfully'
    });

  } catch (error) {
    console.error('Avatar upload API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// Remove avatar
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    // Remove from storage
    const { error: removeError } = await supabase
      .storage
      .from('avatars')
      .remove([`avatars/${user.id}`]);

    if (removeError) {
      console.error('Error removing avatar:', removeError);
      return NextResponse.json(
        { error: 'Failed to remove avatar', details: removeError.message }, 
        { status: 500 }
      );
    }

    // Update user metadata in users table
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: null })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error clearing avatar URL:', updateError);
      return NextResponse.json(
        { error: 'Failed to clear avatar URL', details: updateError.message }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Avatar removed successfully'
    });

  } catch (error) {
    console.error('Avatar removal API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}