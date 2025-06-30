-- Create notification_type enum
CREATE TYPE public.notification_type AS ENUM (
    'company_invitation',
    'invitation_accepted',
    'invitation_rejected',
    'user_joined_company',
    'role_changed'
);

-- Create notifications table
CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "userId" uuid NOT NULL,
    type public.notification_type NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    data jsonb,
    read boolean DEFAULT false NOT NULL,
    "actionUrl" text,
    "createdAt" timestamptz DEFAULT now() NOT NULL,
    "expiresAt" timestamptz,
    
    -- Foreign key constraint
    CONSTRAINT notifications_userId_fkey 
        FOREIGN KEY ("userId") REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX notifications_userId_idx ON public.notifications ("userId");
CREATE INDEX notifications_read_idx ON public.notifications (read);
CREATE INDEX notifications_type_idx ON public.notifications (type);
CREATE INDEX notifications_createdAt_idx ON public.notifications ("createdAt");

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only see their own notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = "userId");

-- RLS policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = "userId");

-- RLS policy: System can insert notifications for any user
CREATE POLICY "System can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);