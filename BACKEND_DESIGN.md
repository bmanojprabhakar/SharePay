# SharePay Backend Migration Design Document

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [High-Level Design](#high-level-design)
4. [Low-Level Design](#low-level-design)
5. [Migration Strategy](#migration-strategy)
6. [Cost Analysis](#cost-analysis)
7. [Implementation Timeline](#implementation-timeline)
8. [Risk Assessment](#risk-assessment)

## Executive Summary

### Objective
Migrate SharePay from direct client-Firestore architecture to a centralized Java backend API to improve security, maintainability, and scalability while keeping costs minimal during MVP phase.

### Key Benefits
- **Security**: Centralized data access control
- **Maintainability**: Single source of truth for business logic
- **Performance**: Server-side optimizations and caching
- **Scalability**: Better resource management and monitoring
- **Cost Efficiency**: Free tier deployment for MVP validation

### Success Metrics
- All client apps use backend APIs (0% direct Firestore calls)
- API response times < 500ms for 95th percentile
- Zero downtime during migration
- Maintain current functionality with improved security

## Current State Analysis

### Current Architecture
```
┌─────────────┐    ┌─────────────────┐    ┌─────────────┐
│   Web App   │───▶│   Firestore     │◀───│ Mobile App  │
│  (Next.js)  │    │   Database      │    │(React Native│
└─────────────┘    └─────────────────┘    └─────────────┘
```

### Current Pain Points
1. **Duplicated Logic**: Balance calculations exist in both web and mobile
2. **Security Concerns**: Direct database access from clients
3. **Performance Issues**: Complex calculations on client devices
4. **Maintenance Overhead**: Schema changes require multiple client updates
5. **No Rate Limiting**: Potential for database abuse
6. **Inconsistent Business Logic**: Risk of calculations diverging between platforms

### Current Data Model (Firestore)
```
/users/{userId}
  - name, email, mobile, countryCode, emailVerified

/groups/{groupId}
  - name, members[], memberEmails[], createdAt, updatedAt
  /expenses/{expenseId}
    - description, amount, category, payers{}, splitBetween[], splitType, splitDetails{}, createdBy

/invites/{inviteId}
  - groupId, inviterEmail, inviteeEmail, status, createdAt
```

## High-Level Design

### Target Architecture
```
┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐
│   Web App   │───▶│  Java Backend   │───▶│   Firestore     │◀───│   Admin     │
│  (Next.js)  │    │  (Spring Boot)  │    │   Database      │    │  Dashboard  │
└─────────────┘    └─────────────────┘    └─────────────────┘    └─────────────┘
       ▲                     ▲                                           ▲
       │                     │                                           │
       ▼                     ▼                                           ▼
┌─────────────┐    ┌─────────────────┐
│ Mobile App  │    │   Monitoring    │
│(React Native│    │  & Analytics    │
└─────────────┘    └─────────────────┘
```

### Technology Stack

#### Backend Services
- **Framework**: Spring Boot 3.x
- **Language**: Java 21 (LTS)
- **Database**: Firestore (Phase 1) → PostgreSQL (Phase 2)
- **Authentication**: Firebase Auth → JWT tokens
- **Deployment**: Railway.app (Free tier)
- **Monitoring**: Railway metrics + Custom logging

#### API Design
- **Protocol**: REST API with JSON
- **Documentation**: OpenAPI 3.0 (Swagger)
- **Versioning**: URL path versioning (/v1/, /v2/)
- **Rate Limiting**: Spring Boot Rate Limiter

### Core Components

#### 1. Authentication Service
```java
@Service
public class AuthService {
    // Firebase token validation
    // JWT token generation/validation
    // User session management
}
```

#### 2. Balance Calculation Service
```java
@Service
public class BalanceService {
    // Centralized balance calculations
    // Group-specific balance logic
    // Expense aggregation
}
```

#### 3. Expense Management Service
```java
@Service
public class ExpenseService {
    // Expense CRUD operations
    // Split calculation logic
    // Expense validation
}
```

#### 4. Group Management Service
```java
@Service
public class GroupService {
    // Group CRUD operations
    // Member management
    // Group statistics
}
```

## Low-Level Design

### API Specification

#### Authentication APIs
```
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
```

#### User Management APIs
```
GET    /api/v1/users/profile
PUT    /api/v1/users/profile
GET    /api/v1/users/{userId}/balance
```

#### Group Management APIs
```
GET    /api/v1/groups
POST   /api/v1/groups
GET    /api/v1/groups/{groupId}
PUT    /api/v1/groups/{groupId}
DELETE /api/v1/groups/{groupId}
POST   /api/v1/groups/{groupId}/members
DELETE /api/v1/groups/{groupId}/members/{userId}
GET    /api/v1/groups/{groupId}/balance/{userEmail}
```

#### Expense Management APIs
```
GET    /api/v1/groups/{groupId}/expenses
POST   /api/v1/groups/{groupId}/expenses
GET    /api/v1/expenses/{expenseId}
PUT    /api/v1/expenses/{expenseId}
DELETE /api/v1/expenses/{expenseId}
GET    /api/v1/users/{userId}/expenses/recent
```

### Database Schema (Firestore - Phase 1)

#### Collections Structure
```
users/
  {userId}/
    - id: String
    - name: String
    - email: String
    - mobile: String
    - countryCode: String
    - emailVerified: boolean
    - createdAt: Timestamp
    - updatedAt: Timestamp

groups/
  {groupId}/
    - id: String
    - name: String
    - emoji: String
    - members: List<String> (userIds)
    - memberEmails: List<String>
    - createdBy: String
    - createdAt: Timestamp
    - updatedAt: Timestamp
    
    expenses/
      {expenseId}/
        - id: String
        - description: String
        - amount: Double
        - category: String
        - payers: Map<String, Double> (email -> amount)
        - splitBetween: List<String> (emails)
        - splitType: String (equal/unequal/payment)
        - splitDetails: Map<String, Double> (email -> amount)
        - createdBy: String
        - createdAt: Timestamp

invites/
  {inviteId}/
    - id: String
    - groupId: String
    - inviterEmail: String
    - inviteeEmail: String
    - status: String (pending/accepted/rejected)
    - createdAt: Timestamp
```

### Java Application Structure

```
src/main/java/com/sharepay/backend/
├── SharePayBackendApplication.java
├── config/
│   ├── FirebaseConfig.java
│   ├── SecurityConfig.java
│   └── SwaggerConfig.java
├── controller/
│   ├── AuthController.java
│   ├── UserController.java
│   ├── GroupController.java
│   └── ExpenseController.java
├── service/
│   ├── AuthService.java
│   ├── UserService.java
│   ├── GroupService.java
│   ├── ExpenseService.java
│   └── BalanceService.java
├── repository/
│   ├── UserRepository.java
│   ├── GroupRepository.java
│   └── ExpenseRepository.java
├── model/
│   ├── dto/
│   │   ├── UserDto.java
│   │   ├── GroupDto.java
│   │   ├── ExpenseDto.java
│   │   └── BalanceDto.java
│   └── entity/
│       ├── User.java
│       ├── Group.java
│       └── Expense.java
├── exception/
│   ├── GlobalExceptionHandler.java
│   └── custom/
└── util/
    ├── FirebaseUtil.java
    └── ValidationUtil.java
```

### Key Classes Implementation

#### 1. Balance Calculation Service
```java
@Service
@Transactional(readOnly = true)
public class BalanceService {
    
    @Autowired
    private ExpenseRepository expenseRepository;
    
    public UserBalanceDto calculateUserBalance(String userId, String userEmail) {
        List<Expense> userExpenses = expenseRepository.findAllUserExpenses(userId);
        
        double totalYouOwe = 0.0;
        double totalOwedToYou = 0.0;
        
        for (Expense expense : userExpenses) {
            BalanceCalculation calc = calculateExpenseBalance(expense, userEmail);
            totalYouOwe += calc.getYouOwe();
            totalOwedToYou += calc.getOwedToYou();
        }
        
        return UserBalanceDto.builder()
            .totalYouOwe(Math.max(0, totalYouOwe))
            .totalOwedToYou(Math.max(0, totalOwedToYou))
            .netBalance(totalOwedToYou - totalYouOwe)
            .build();
    }
    
    public GroupBalanceDto calculateGroupBalance(String groupId, String userEmail) {
        List<Expense> groupExpenses = expenseRepository.findByGroupId(groupId);
        
        double youOwe = 0.0;
        double owedToYou = 0.0;
        double totalExpenses = 0.0;
        
        for (Expense expense : groupExpenses) {
            totalExpenses += expense.getAmount();
            BalanceCalculation calc = calculateExpenseBalance(expense, userEmail);
            youOwe += calc.getYouOwe();
            owedToYou += calc.getOwedToYou();
        }
        
        return GroupBalanceDto.builder()
            .youOwe(Math.max(0, youOwe))
            .owedToYou(Math.max(0, owedToYou))
            .netBalance(owedToYou - youOwe)
            .totalExpenses(totalExpenses)
            .build();
    }
    
    private BalanceCalculation calculateExpenseBalance(Expense expense, String userEmail) {
        if ("payment".equals(expense.getSplitType())) {
            return calculatePaymentBalance(expense, userEmail);
        }
        
        double userShare = calculateUserShare(expense, userEmail);
        double amountPaid = expense.getPayers().getOrDefault(userEmail, 0.0);
        
        if (amountPaid > userShare) {
            return new BalanceCalculation(0.0, amountPaid - userShare);
        } else {
            return new BalanceCalculation(userShare - amountPaid, 0.0);
        }
    }
    
    private double calculateUserShare(Expense expense, String userEmail) {
        if (!expense.getSplitBetween().contains(userEmail)) {
            return 0.0;
        }
        
        if ("equal".equals(expense.getSplitType())) {
            return expense.getAmount() / expense.getSplitBetween().size();
        } else {
            return expense.getSplitDetails().getOrDefault(userEmail, 0.0);
        }
    }
}
```

#### 2. Expense Controller
```java
@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8081"})
public class ExpenseController {
    
    @Autowired
    private ExpenseService expenseService;
    
    @Autowired
    private BalanceService balanceService;
    
    @GetMapping("/groups/{groupId}/expenses")
    public ResponseEntity<PagedResponse<ExpenseDto>> getGroupExpenses(
            @PathVariable String groupId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        PagedResponse<ExpenseDto> expenses = expenseService.getGroupExpenses(groupId, page, size);
        return ResponseEntity.ok(expenses);
    }
    
    @PostMapping("/groups/{groupId}/expenses")
    public ResponseEntity<ExpenseDto> createExpense(
            @PathVariable String groupId,
            @Valid @RequestBody CreateExpenseRequest request,
            Authentication authentication) {
        
        String userEmail = authentication.getName();
        ExpenseDto expense = expenseService.createExpense(groupId, request, userEmail);
        return ResponseEntity.status(HttpStatus.CREATED).body(expense);
    }
    
    @GetMapping("/groups/{groupId}/balance/{userEmail}")
    public ResponseEntity<GroupBalanceDto> getGroupBalance(
            @PathVariable String groupId,
            @PathVariable String userEmail,
            Authentication authentication) {
        
        // Validate user has access to this group
        validateUserGroupAccess(authentication.getName(), groupId);
        
        GroupBalanceDto balance = balanceService.calculateGroupBalance(groupId, userEmail);
        return ResponseEntity.ok(balance);
    }
    
    @GetMapping("/users/{userId}/expenses/recent")
    public ResponseEntity<List<ExpenseDto>> getRecentExpenses(
            @PathVariable String userId,
            @RequestParam(defaultValue = "10") int limit,
            Authentication authentication) {
        
        validateUserAccess(authentication.getName(), userId);
        
        List<ExpenseDto> expenses = expenseService.getRecentUserExpenses(userId, limit);
        return ResponseEntity.ok(expenses);
    }
}
```

#### 3. Firebase Repository Implementation
```java
@Repository
public class ExpenseRepository {
    
    private final Firestore firestore;
    
    public ExpenseRepository() {
        this.firestore = FirestoreClient.getFirestore();
    }
    
    public List<Expense> findByGroupId(String groupId) {
        try {
            CollectionReference expensesRef = firestore
                .collection("groups")
                .document(groupId)
                .collection("expenses");
            
            QuerySnapshot querySnapshot = expensesRef
                .orderBy("createdAt", Query.Direction.DESCENDING)
                .get()
                .get();
            
            return querySnapshot.getDocuments().stream()
                .map(this::mapToExpense)
                .collect(Collectors.toList());
                
        } catch (Exception e) {
            throw new RuntimeException("Error fetching group expenses", e);
        }
    }
    
    public String createExpense(String groupId, Expense expense) {
        try {
            CollectionReference expensesRef = firestore
                .collection("groups")
                .document(groupId)
                .collection("expenses");
            
            DocumentReference docRef = expensesRef.add(mapToDocument(expense)).get();
            
            // Update group's updatedAt timestamp
            firestore.collection("groups")
                .document(groupId)
                .update("updatedAt", FieldValue.serverTimestamp());
                
            return docRef.getId();
            
        } catch (Exception e) {
            throw new RuntimeException("Error creating expense", e);
        }
    }
    
    private Expense mapToExpense(DocumentSnapshot doc) {
        return Expense.builder()
            .id(doc.getId())
            .description(doc.getString("description"))
            .amount(doc.getDouble("amount"))
            .category(doc.getString("category"))
            .payers((Map<String, Double>) doc.get("payers"))
            .splitBetween((List<String>) doc.get("splitBetween"))
            .splitType(doc.getString("splitType"))
            .splitDetails((Map<String, Double>) doc.get("splitDetails"))
            .createdBy(doc.getString("createdBy"))
            .createdAt(doc.getTimestamp("createdAt").toDate())
            .build();
    }
}
```

### Configuration Files

#### 1. Application Properties
```properties
# Application Configuration
spring.application.name=sharepay-backend
server.port=8080
spring.profiles.active=dev

# Firebase Configuration
firebase.project-id=stage-sharepay
firebase.credentials-path=classpath:firebase-service-account.json

# Logging Configuration
logging.level.com.sharepay=DEBUG
logging.level.org.springframework.security=DEBUG

# CORS Configuration
app.cors.allowed-origins=http://localhost:3000,http://localhost:8081

# Rate Limiting
app.rate-limit.requests-per-minute=100
```

#### 2. Docker Configuration
```dockerfile
FROM openjdk:21-jdk-slim

WORKDIR /app

COPY target/sharepay-backend-*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
```

## Migration Strategy

### Phase 1: Setup & Core APIs (Weeks 1-2)
**Goal**: Create Java backend with basic APIs

**Tasks**:
- Set up Spring Boot project structure
- Configure Firebase connection
- Implement authentication service
- Create balance calculation APIs
- Deploy to Railway.app
- Update mobile/web apps to use balance APIs only

**Success Criteria**:
- Backend deployed and accessible
- Balance calculations moved to backend
- All tests passing

### Phase 2: Expense Management (Weeks 3-4)
**Goal**: Move expense operations to backend

**Tasks**:
- Implement expense CRUD APIs
- Add expense validation logic
- Create recent expenses API
- Update clients to use expense APIs
- Add API documentation (Swagger)

**Success Criteria**:
- All expense operations through API
- Client apps updated and tested
- API documentation available

### Phase 3: Group Management (Weeks 5-6)
**Goal**: Complete group operations migration

**Tasks**:
- Implement group management APIs
- Add member management endpoints
- Create group statistics APIs
- Update clients for group operations
- Add comprehensive testing

**Success Criteria**:
- 100% API coverage for current features
- No direct Firestore calls from clients
- Performance benchmarks met

### Phase 4: Enhancement & Monitoring (Weeks 7-8)
**Goal**: Production readiness improvements

**Tasks**:
- Add caching layer (Redis if needed)
- Implement comprehensive logging
- Add monitoring and alerting
- Performance optimization
- Security audit

**Success Criteria**:
- Production-ready monitoring
- Security best practices implemented
- Performance targets achieved

### Client-Side Migration

#### Mobile App Changes
```typescript
// Before (Direct Firestore)
const balance = await balanceService.calculateUserBalance(userId, userEmail);

// After (API Call)
const balance = await apiClient.get(`/api/v1/users/${userId}/balance`);
```

#### Web App Changes
```typescript
// Before (Direct Firestore)
const expenses = await expenseService.getGroupExpenses(groupId);

// After (API Call)  
const expenses = await fetch(`/api/v1/groups/${groupId}/expenses`).then(r => r.json());
```

## Cost Analysis

### Free Tier Breakdown

#### Railway.app (Primary Platform)
- **Cost**: $5/month credit (effectively free for small apps)
- **Includes**: 
  - 512MB RAM, 1 vCPU
  - 1GB storage
  - Unlimited bandwidth
  - PostgreSQL database
  - Auto-deployments from Git

#### Alternative Options
1. **Render.com**: 750 hours/month free (31 days = 744 hours)
2. **Fly.io**: $5/month credit
3. **Google Cloud Run**: 2M requests/month free

#### Database Costs
- **Keep Firestore**: Current free tier (1GB storage, 50K reads/day)
- **Railway PostgreSQL**: Included in $5 credit
- **Neon**: 10GB free PostgreSQL

### Projected Costs (Monthly)

| Service | Free Tier | Paid Tier | Notes |
|---------|-----------|-----------|--------|
| Railway.app | $0 (with $5 credit) | $5+ | Includes DB & hosting |
| Firestore | $0 (under limits) | $0.18/100K reads | Current usage well under limits |
| Domain | $0 (Railway subdomain) | $12/year | Optional custom domain |
| **Total** | **$0/month** | **$5-10/month** | **Scales with usage** |

### Cost Optimization Strategies
1. **Start with Railway free tier** - Covers MVP needs
2. **Keep Firestore temporarily** - Avoid migration costs
3. **Use Railway PostgreSQL when scaling** - Better performance
4. **Monitor usage closely** - Set up billing alerts

## Implementation Timeline

### Detailed Sprint Plan

#### Sprint 1 (Week 1): Project Setup
- [x] Create Spring Boot project
- [x] Set up Firebase configuration
- [x] Configure Railway deployment
- [x] Basic health check endpoint
- [x] CI/CD pipeline setup

#### Sprint 2 (Week 1-2): Authentication & Balance APIs
- [ ] Implement Firebase authentication
- [ ] Create JWT token service
- [ ] Build balance calculation service
- [ ] Create balance endpoints
- [ ] Write unit tests
- [ ] Update mobile app for balance API

#### Sprint 3 (Week 2-3): Expense Management
- [ ] Implement expense CRUD operations
- [ ] Add expense validation logic
- [ ] Create recent expenses endpoint
- [ ] Add expense filtering/pagination
- [ ] Update web app for expense APIs
- [ ] Integration testing

#### Sprint 4 (Week 3-4): Group Management  
- [ ] Implement group CRUD operations
- [ ] Add member management
- [ ] Create group statistics
- [ ] Group balance calculations
- [ ] Update both apps for group APIs
- [ ] End-to-end testing

#### Sprint 5 (Week 4-5): Documentation & Polish
- [ ] Complete API documentation
- [ ] Add monitoring/logging
- [ ] Performance testing
- [ ] Security review
- [ ] Production deployment
- [ ] User acceptance testing

### Rollback Strategy
- **Database**: Keep Firestore as primary during migration
- **APIs**: Feature flags to toggle between direct/API access
- **Deployment**: Blue-green deployment for zero downtime
- **Monitoring**: Real-time health checks and alerts

## Risk Assessment

### Technical Risks

#### High Risk
1. **Firebase Auth Integration Complexity**
   - *Mitigation*: Use Firebase Admin SDK, extensive testing
   - *Fallback*: JWT-only authentication initially

2. **Performance Degradation**  
   - *Mitigation*: Caching layer, database optimization
   - *Fallback*: Scale Railway resources, optimize queries

3. **Data Consistency Issues**
   - *Mitigation*: Transaction management, atomic operations
   - *Fallback*: Database rollback procedures

#### Medium Risk
1. **Free Tier Limitations**
   - *Mitigation*: Monitor usage, optimize resource usage
   - *Fallback*: Upgrade to paid tier ($5/month)

2. **API Versioning Complexity**
   - *Mitigation*: Start with v1, plan versioning strategy
   - *Fallback*: Deprecation notices, backward compatibility

#### Low Risk
1. **Learning Curve for Team**
   - *Mitigation*: Leverage existing Java expertise
   - *Fallback*: Documentation, pair programming

### Business Risks

#### Market Risk
- **User adoption during migration**: Rolling deployment, feature parity
- **Competition**: Focus on core features first, MVP approach

#### Operational Risk  
- **Single point of failure**: Railway uptime monitoring, backup deployment
- **Data loss**: Regular backups, transaction logging

### Risk Monitoring Plan
1. **Daily**: Application health checks, error rate monitoring
2. **Weekly**: Performance metrics review, cost analysis
3. **Monthly**: Security audit, capacity planning review

## Success Criteria & KPIs

### Technical KPIs
- **API Response Time**: < 500ms for 95th percentile
- **Uptime**: > 99.5% availability
- **Error Rate**: < 1% of all requests
- **Test Coverage**: > 80% code coverage

### Business KPIs  
- **Migration Completion**: 100% API coverage by Week 6
- **User Experience**: No feature regression during migration
- **Cost Efficiency**: Stay within free tier for first 3 months
- **Security**: Zero security incidents during migration

### Quality Gates
1. **Phase 1**: All balance calculations moved to API
2. **Phase 2**: All CRUD operations through API
3. **Phase 3**: Zero direct database calls from clients
4. **Phase 4**: Production-ready monitoring and security

## Conclusion

This migration to a Java backend will significantly improve SharePay's architecture by centralizing business logic, enhancing security, and providing a scalable foundation for growth. The phased approach minimizes risk while the free tier deployment keeps costs minimal during MVP validation.

The combination of Java expertise, proven Spring Boot framework, and Railway's simple deployment makes this a strong technical foundation that can scale from MVP to production efficiently.

**Recommendation**: Proceed with Phase 1 implementation to validate the architecture and deployment pipeline before committing to the full migration.