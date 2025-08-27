# 📱 Group Setup Guide

## 🔒 **Group Membership Requirement**

আপনার bot এখন group join requirement সহ কাজ করবে। User `/start` click করলে:

1. **Group member না হলে** - Mini App access নেই
2. **Group member হলে** - Full access + Mini App link
3. **Database sync** - Bot এবং Mini App একই database use করে

## 🚀 **Setup Steps**

### **Step 1: Get Your Group ID**

#### **Method 1: Using Bot**
1. Bot কে আপনার group এ add করুন
2. Group এ `/start` command দিন
3. Bot console এ group ID দেখতে পাবেন

#### **Method 2: Using @userinfobot**
1. @userinfobot কে আপনার group এ add করুন
2. Group এ `/start` command দিন
3. Bot group ID show করবে

#### **Method 3: Manual Calculation**
- Group link: `https://t.me/+GOIMwAc_R9RhZGVk?`
- Group ID: `-100` + random numbers

### **Step 2: Update Bot Configuration**

`bot_database.py` file এ এই lines update করুন:

```python
# Group configuration
REQUIRED_GROUP_ID = -1001234567890  # আপনার group ID এখানে দিন
REQUIRED_GROUP_LINK = "https://t.me/your_group_link"  # আপনার group link এখানে দিন
REQUIRED_GROUP_NAME = "Cash Points Community"  # আপনার group name
```

### **Step 3: Restart Bot**

```bash
# Stop current bot (Ctrl+C)
# Then restart
python bot_database.py
```

## 📊 **How It Works**

### **User Experience:**

#### **1. Non-Member User:**
```
User clicks /start → Bot checks membership → Shows join requirement
```

**Message:**
```
🔒 Access Restricted

হ্যালো [Name]! আপনি এখনও আমাদের [Group Name] group এ join করেননি।

📋 Requirements:
✅ Group এ join করতে হবে
✅ Active member হতে হবে
✅ Bot commands ব্যবহার করতে হবে

🚫 Without joining:
❌ Mini App access নেই
❌ Rewards নেই
❌ Referral system নেই

👉 Join the group first to unlock all features!
```

**Buttons:**
- `Join [Group Name] 📱` - Group link
- `I've Joined ✅` - Verify membership

#### **2. Group Member User:**
```
User clicks /start → Bot checks membership → Shows Mini App
```

**Message:**
```
🎉 স্বাগতম [Name]!

🏆 রিওয়ার্ড অর্জন এখন আরও সহজ!

✅ কোনো ইনভেস্টমেন্ট ছাড়াই প্রতিদিন জিতে নিন রিওয়ার্ড।
👥 শুধু টেলিগ্রামে মেম্বার অ্যাড করুন,
🎯 সহজ কিছু টাস্ক সম্পন্ন করুন আর
🚀 লেভেল আপ করুন।

📈 প্রতিটি লেভেলেই থাকছে বাড়তি বোনাস এবং নতুন সুবিধা।
💎 যত বেশি সক্রিয় হবেন, তত বেশি রিওয়ার্ড আপনার হাতে।

👉 এখনই শুরু করুন এবং আপনার রিওয়ার্ড ক্লেইম করুন!
```

**Button:**
- `Open and Earn 💰` - Mini App link

## 🔄 **Database Integration**

### **Same Database:**
- **Bot** এবং **Mini App** একই Supabase database use করে
- **User data** automatically sync হয়
- **Join/Leave tracking** real-time update হয়
- **Rewards** automatically calculate হয়

### **Data Flow:**
```
User joins group → Bot detects → Database updated → Mini App shows updated data
User leaves group → Bot detects → Database updated → Mini App shows updated data
Referral link clicked → Bot tracks → Database updated → Mini App shows analytics
```

## 🛠️ **Troubleshooting**

### **Common Issues:**

#### **1. Bot Can't Check Membership**
```
❌ Error checking group membership: [Error]
```

**Solutions:**
- Bot কে group এ admin করুন
- Bot permissions check করুন
- Group ID correct কিনা verify করুন

#### **2. User Still Can't Access After Joining**
```
❌ User still not in group
```

**Solutions:**
- User group এ actually join করেছে কিনা check করুন
- Bot group এ আছে কিনা verify করুন
- Group privacy settings check করুন

#### **3. Database Not Syncing**
```
❌ Database error: [Error]
```

**Solutions:**
- Supabase credentials check করুন
- Database tables exist কিনা verify করুন
- Bot restart করুন

## 📋 **Required Bot Permissions**

Bot কে group এ এই permissions দিন:

- ✅ **Read Messages** - Messages পড়তে পারবে
- ✅ **Send Messages** - Messages পাঠাতে পারবে
- ✅ **View Group Info** - Group information দেখতে পারবে
- ✅ **Add Members** (Optional) - Members add করতে পারবে

## 🔍 **Testing**

### **Test Scenarios:**

1. **Non-member user** `/start` দেয়
   - Expected: Join requirement message
   - Expected: No Mini App access

2. **User joins group** এবং `/start` দেয়
   - Expected: Welcome message
   - Expected: Mini App access

3. **User leaves group** এবং `/start` দেয়
   - Expected: Join requirement message
   - Expected: No Mini App access

4. **Database sync** check
   - Expected: User data updated
   - Expected: Mini App shows correct data

## 📈 **Benefits**

### **Security:**
- ✅ Only group members access Mini App
- ✅ Prevents unauthorized access
- ✅ Controlled user base

### **Engagement:**
- ✅ Users must join group
- ✅ Active community building
- ✅ Better user retention

### **Analytics:**
- ✅ Track group membership
- ✅ Monitor user engagement
- ✅ Measure conversion rates

---

**🎯 Goal**: Ensure only group members can access Mini App while maintaining full database synchronization.
