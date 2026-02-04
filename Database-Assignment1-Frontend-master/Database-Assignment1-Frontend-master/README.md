## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- Git

### Installation Steps

1. **Clone the repository:**

```bash
git clone https://github.com/junyuan04/electricity-billing-system.git
cd electricity-billing-system
```

2. **Setup Backend:**

```bash
cd backend
npm install
node server.js
```

Backend will run on: `http://localhost:5000`

3. **Setup Frontend** (open new terminal):

```bash
cd frontend
npm install
npm start
```

Frontend will run on: `http://localhost:3000`

## Test Accounts

### Customer

- Username: `customer1`
- Password: `test`

### Staff

- Username: `staff1`
- Password: `test`

### Administrator

- Username: `admin`
- Password: `test`

## Security Measures Implemented

- JWT token-based authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Row-level security (customers see only their data)
- Audit logging for all operations
- Input validation

## Status

- [x] Backend API setup
- [x] Authentication & Authorization
- [x] Customer Dashboard
- [ ] Staff Dashboard (In Progress)
- [ ] Admin Dashboard (To Do)
- [ ] Database Integration
- [ ] STRIDE/DREAD Analysis
- [ ] PDPA Compliance Documentation

## Notes

- Currently using mock data (array-based storage)
- All passwords are hashed using bcrypt
