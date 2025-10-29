#!/bin/bash

# Migration Validation Script
# Run this locally before committing migrations: ./scripts/validate-migration.sh

set -e

echo "🔍 Supabase Migration Validator"
echo "================================"

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Check if migrations directory exists
if [ ! -d "supabase/migrations" ]; then
  echo -e "${RED}❌ Error: supabase/migrations directory not found${NC}"
  exit 1
fi

echo ""
echo "📁 Scanning migration files..."

# Get all SQL migration files (exclude backup directory)
MIGRATION_FILES=$(find supabase/migrations -name "*.sql" -type f -not -path "*/backup/*" | sort)

if [ -z "$MIGRATION_FILES" ]; then
  echo -e "${YELLOW}⚠️  No migration files found${NC}"
  exit 0
fi

# Count migrations
MIGRATION_COUNT=$(echo "$MIGRATION_FILES" | wc -l)
echo -e "${GREEN}Found $MIGRATION_COUNT migration file(s)${NC}"
echo ""

# Validate each migration file
for file in $MIGRATION_FILES; do
  filename=$(basename "$file")
  echo "Checking: $filename"

  # Check 1: File naming convention
  if [[ ! "$filename" =~ ^[0-9]{14}_.*\.sql$ ]] && [[ ! "$filename" =~ ^[0-9]{8}_.*\.sql$ ]]; then
    echo -e "${YELLOW}  ⚠️  Warning: Filename doesn't follow convention (YYYYMMDDHHMMSS_description.sql)${NC}"
    WARNINGS=$((WARNINGS + 1))
  fi

  # Check 2: File is not empty
  if [ ! -s "$file" ]; then
    echo -e "${RED}  ❌ Error: File is empty${NC}"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  # Check 3: Has SQL statements (contains semicolons)
  if ! grep -q ";" "$file"; then
    echo -e "${RED}  ❌ Error: No SQL statements found (missing semicolons)${NC}"
    ERRORS=$((ERRORS + 1))
  fi

  # Check 4: Dangerous operations
  if grep -qi "DROP TABLE" "$file"; then
    echo -e "${YELLOW}  ⚠️  Warning: Contains DROP TABLE - ensure this is intentional${NC}"
    WARNINGS=$((WARNINGS + 1))
  fi

  # Check for DROP DATABASE as an actual command (not in strings or comments)
  # Store matches in variable to avoid pipeline failures with set -e
  DROP_DB_MATCHES=$(grep -Ei "^\s*DROP\s+DATABASE" "$file" 2>/dev/null | grep -v "^--" 2>/dev/null | grep -v "'" 2>/dev/null || true)
  if [ -n "$DROP_DB_MATCHES" ]; then
    echo -e "${RED}  ❌ Error: Contains DROP DATABASE - extremely dangerous!${NC}"
    ERRORS=$((ERRORS + 1))
  fi

  if grep -qi "TRUNCATE" "$file"; then
    echo -e "${YELLOW}  ⚠️  Warning: Contains TRUNCATE - data will be deleted${NC}"
    WARNINGS=$((WARNINGS + 1))
  fi

  # Check 5: DELETE without WHERE clause
  if grep -Ei "DELETE\s+FROM\s+\w+\s*;" "$file"; then
    echo -e "${YELLOW}  ⚠️  Warning: DELETE without WHERE clause - will delete all rows${NC}"
    WARNINGS=$((WARNINGS + 1))
  fi

  # Check 6: Contains transaction blocks for safety
  if grep -qi "DROP\|ALTER\|DELETE\|TRUNCATE" "$file"; then
    if ! grep -qi "BEGIN\|START TRANSACTION" "$file"; then
      echo -e "${YELLOW}  ⚠️  Warning: Destructive operation without explicit transaction${NC}"
      WARNINGS=$((WARNINGS + 1))
    fi
  fi

  # Check 7: RLS policies - ensure they're not too permissive
  if grep -qi "CREATE POLICY.*USING.*TRUE" "$file"; then
    echo -e "${YELLOW}  ⚠️  Warning: RLS policy with USING (TRUE) - allows all access${NC}"
    WARNINGS=$((WARNINGS + 1))
  fi

  # Check 8: Check for common syntax errors
  # Unclosed quotes check disabled - causes too many false positives with SQL's escaped quotes
  # SQL uses '' for escaping quotes and quotes in strings/comments break simple counting
  # SINGLE_QUOTES=$(grep -o "'" "$file" | wc -l)
  # if [ $((SINGLE_QUOTES % 2)) -ne 0 ]; then
  #   echo -e "${YELLOW}  ⚠️  Warning: Odd number of single quotes - check for unclosed strings${NC}"
  #   ((WARNINGS++))
  # fi

  # Check 9: Security - no hardcoded secrets
  if grep -Ei "(password|secret|api_key|token)\s*=\s*['\"][^'\"]{10,}" "$file"; then
    echo -e "${RED}  ❌ Error: Possible hardcoded secret detected${NC}"
    ERRORS=$((ERRORS + 1))
  fi

  # Check 10: Idempotency - recommend IF NOT EXISTS
  if grep -qi "CREATE TABLE\|CREATE INDEX\|CREATE FUNCTION" "$file"; then
    if ! grep -qi "IF NOT EXISTS\|OR REPLACE" "$file"; then
      echo -e "${YELLOW}  ⚠️  Warning: Consider using IF NOT EXISTS for idempotency${NC}"
      WARNINGS=$((WARNINGS + 1))
    fi
  fi

  echo ""
done

echo "================================"
echo "Validation Summary"
echo "================================"

if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}❌ $ERRORS error(s) found${NC}"
fi

if [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}⚠️  $WARNINGS warning(s) found${NC}"
fi

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed!${NC}"
  exit 0
elif [ $ERRORS -gt 0 ]; then
  echo ""
  echo -e "${RED}Please fix errors before committing${NC}"
  exit 1
else
  echo ""
  echo -e "${YELLOW}Review warnings - migrations will still run${NC}"
  exit 0
fi
