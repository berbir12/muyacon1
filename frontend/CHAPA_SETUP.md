# Chapa Payment Gateway Setup

## 🔧 **Quick Fix for Current Error**

The "Chapa API Error" is happening because the API credentials are not configured. Here's how to fix it:

### **Step 1: Set Environment Variables**

Create a `.env.local` file in your `frontend` directory with:

```env
# Chapa Payment Gateway Configuration
EXPO_PUBLIC_CHAPA_PUBLIC_KEY=CHAPUBK_TEST-dtyRbkCvLfkYMpzXE6IbUMSPJC1XvJ1q
EXPO_PUBLIC_CHAPA_SECRET_KEY=CHASECK_TEST-your_actual_secret_key_here
EXPO_PUBLIC_CHAPA_WEBHOOK_SECRET=qwertyuil@1A

# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# App URLs
EXPO_PUBLIC_API_URL=https://mchapaw-n0utcbuab-bereket-birhanu-kinfus-projects.vercel.app
EXPO_PUBLIC_APP_URL=https://muyacon.com
```

### **Step 2: Get Your Chapa Secret Key**

1. Go to [Chapa Dashboard](https://dashboard.chapa.co/)
2. Navigate to **Settings > API**
3. Copy your **Test Secret Key**
4. Replace `CHASECK_TEST-your_actual_secret_key_here` with your actual secret key

### **Step 3: Restart the App**

```bash
# Stop the current app (Ctrl+C)
# Then restart with:
npx expo start --clear
```

## 🧪 **Test Mode**

For testing, you can use Chapa's test credentials:
- **Public Key**: `CHAPUBK_TEST-dtyRbkCvLfkYMpzXE6IbUMSPJC1XvJ1q`
- **Secret Key**: Get from your Chapa dashboard
- **Test Cards**: Use Chapa's test card numbers

## 🔍 **Troubleshooting**

### **Error: "Chapa API credentials not configured"**
- Make sure you've set `EXPO_PUBLIC_CHAPA_SECRET_KEY` in your `.env.local` file
- Restart the app after setting environment variables

### **Error: "Chapa API Error: [object Object]"**
- Check that your secret key is correct
- Make sure you're using the test secret key (starts with `CHASECK_TEST-`)
- Verify the key is not expired

### **Metro Bundler Errors**
- Run `npx expo start --clear` to clear the cache
- Delete `node_modules` and run `npm install` if needed

## ✅ **Verification**

Once configured, you should see:
- ✅ Payment modal opens without errors
- ✅ Payment breakdown shows correctly
- ✅ "Pay with Chapa" button works
- ✅ Redirects to Chapa checkout page

## 🚀 **Production Setup**

For production:
1. Switch to live mode in Chapa dashboard
2. Get live API credentials
3. Update environment variables
4. Test with real payments

## 📞 **Support**

If you're still having issues:
1. Check the console for detailed error messages
2. Verify your Chapa dashboard settings
3. Make sure all environment variables are set correctly
