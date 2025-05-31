#!/bin/bash

# Test script for MCP Host Server authentication
# Usage: ./test-authentication.sh

set -e

API_BASE="https://mcp.mvrx.com.au"
EMAIL="admin@mcp.mvrx.com.au"
PASSWORD="SecureMCP2024!"

echo "🔍 Testing MCP Host Server..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 1: Health check
echo "1️⃣  Testing health endpoint..."
HEALTH=$(curl -s "$API_BASE/health")
echo "✅ Health: $HEALTH"
echo ""

# Test 2: Root endpoint
echo "2️⃣  Testing root endpoint..."
ROOT=$(curl -s "$API_BASE/")
echo "✅ Root response:"
echo "$ROOT" | jq .
echo ""

# Test 3: Authentication
echo "3️⃣  Testing authentication..."
echo "📧 Email: $EMAIL"
echo "🔑 Password: $PASSWORD"

AUTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

# Split response and HTTP code
HTTP_CODE=$(echo "$AUTH_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$AUTH_RESPONSE" | sed '/HTTP_CODE:/d')

echo "📡 HTTP Status: $HTTP_CODE"
echo "📄 Response Body:"
echo "$RESPONSE_BODY" | jq . 2>/dev/null || echo "$RESPONSE_BODY"

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Authentication successful!"
    
    # Extract token if available
    TOKEN=$(echo "$RESPONSE_BODY" | jq -r '.token // empty' 2>/dev/null)
    if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
        echo "🎟️  Token: ${TOKEN:0:20}..."
        
        echo ""
        echo "4️⃣  Testing authenticated endpoint..."
        
        # Test authenticated endpoint
        STATUS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
          -H "Authorization: Bearer $TOKEN" \
          "$API_BASE/api/status")
        
        STATUS_HTTP_CODE=$(echo "$STATUS_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
        STATUS_BODY=$(echo "$STATUS_RESPONSE" | sed '/HTTP_CODE:/d')
        
        echo "📡 Status HTTP Code: $STATUS_HTTP_CODE"
        echo "📄 Status Response:"
        echo "$STATUS_BODY" | jq . 2>/dev/null || echo "$STATUS_BODY"
        
        if [ "$STATUS_HTTP_CODE" = "200" ]; then
            echo "✅ Authenticated request successful!"
            
            echo ""
            echo "5️⃣  Testing server creation..."
            
            # Test server creation
            CREATE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
              -X POST "$API_BASE/api/servers" \
              -H "Authorization: Bearer $TOKEN" \
              -H "Content-Type: application/json" \
              -d '{
                "name": "Test File Manager",
                "type": "file-manager",
                "description": "Test server for demonstration"
              }')
            
            CREATE_HTTP_CODE=$(echo "$CREATE_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
            CREATE_BODY=$(echo "$CREATE_RESPONSE" | sed '/HTTP_CODE:/d')
            
            echo "📡 Create HTTP Code: $CREATE_HTTP_CODE"
            echo "📄 Create Response:"
            echo "$CREATE_BODY" | jq . 2>/dev/null || echo "$CREATE_BODY"
            
            if [ "$CREATE_HTTP_CODE" = "201" ]; then
                echo "✅ Server creation successful!"
                
                SERVER_ID=$(echo "$CREATE_BODY" | jq -r '.id // empty' 2>/dev/null)
                if [ -n "$SERVER_ID" ] && [ "$SERVER_ID" != "null" ]; then
                    echo "🆔 Server ID: $SERVER_ID"
                    
                    echo ""
                    echo "6️⃣  Testing connection URL generation..."
                    
                    # Test connection URL
                    CONNECT_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
                      -X POST "$API_BASE/api/servers/$SERVER_ID/connect" \
                      -H "Authorization: Bearer $TOKEN")
                    
                    CONNECT_HTTP_CODE=$(echo "$CONNECT_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
                    CONNECT_BODY=$(echo "$CONNECT_RESPONSE" | sed '/HTTP_CODE:/d')
                    
                    echo "📡 Connect HTTP Code: $CONNECT_HTTP_CODE"
                    echo "📄 Connect Response:"
                    echo "$CONNECT_BODY" | jq . 2>/dev/null || echo "$CONNECT_BODY"
                    
                    if [ "$CONNECT_HTTP_CODE" = "200" ]; then
                        echo "✅ Connection URL generated!"
                        
                        CONNECTION_URL=$(echo "$CONNECT_BODY" | jq -r '.connectionUrl // empty' 2>/dev/null)
                        if [ -n "$CONNECTION_URL" ] && [ "$CONNECTION_URL" != "null" ]; then
                            echo "🔗 Connection URL: $CONNECTION_URL"
                        fi
                    else
                        echo "❌ Connection URL generation failed"
                    fi
                else
                    echo "⚠️  Could not extract server ID"
                fi
            else
                echo "❌ Server creation failed"
            fi
        else
            echo "❌ Authenticated request failed"
        fi
    else
        echo "⚠️  Could not extract token from response"
    fi
else
    echo "❌ Authentication failed"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏁 Test completed!"

# Show usage instructions
echo ""
echo "💡 Usage Instructions:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━"
echo "If authentication worked, save your token:"
echo ""
echo "export MCP_TOKEN='your-token-here'"
echo ""
echo "Then create servers:"
echo "curl -X POST $API_BASE/api/servers \\"
echo "  -H \"Authorization: Bearer \$MCP_TOKEN\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"name\": \"My Server\", \"type\": \"file-manager\"}'"
echo ""
echo "For full usage guide, see: usage-guide.md"