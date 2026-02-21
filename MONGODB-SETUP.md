# MongoDB Setup for Enoch Legal Blog

## Option 1: MongoDB Atlas (Recommended - Free Forever)

### Step 1: Create MongoDB Atlas Account
1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up for free
3. Create a free M0 cluster (512MB - perfect for your blog)

### Step 2: Get Connection String
1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)
4. Replace `<password>` with your actual password

### Step 3: Add to Railway
1. Go to your Railway project
2. Click on your service
3. Go to "Variables" tab
4. Add new variable:
   - Name: `MONGODB_URI`
   - Value: Your connection string

## Option 2: Railway MongoDB Plugin (Paid)

Railway charges for MongoDB. If you want to use it:
```bash
railway add
# Select MongoDB
```

## I'll Update the Code Now

I'm updating your server.js to use MongoDB instead of JSON file.
