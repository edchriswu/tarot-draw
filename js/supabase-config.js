// Supabase 設定
// ⚠️ 請將以下值替換為你的 Supabase 專案設定
const SUPABASE_URL = 'https://tndrnnxdmkchniviplxz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuZHJubnhkbWtjaG5pdmlwbHh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MDYxODMsImV4cCI6MjA3OTk4MjE4M30.IXxkRPiPHjrRSQIpXE_6Hq2eksTnmeFGOk7rXrPhnzc';

// 初始化 Supabase 客戶端
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 檢查是否已設定
function isSupabaseConfigured() {
    return SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY';
}
