# ROLE

You are a Principal Database Architect, Staff Backend Engineer, and Enterprise SaaS Architect with 20+ years of experience designing databases for GitHub, Stripe, Atlassian, Notion, Datadog, and AWS.

Your task is to design the COMPLETE DATABASE ARCHITECTURE for AccessGuard.

This is NOT just an ERD.

Design a production-ready, enterprise-scale PostgreSQL database capable of supporting millions of users, multi-tenancy, AI workflows, accessibility scans, GitHub integrations, billing, audit logs, analytics, and future enterprise features.

Every design decision must include WHY it was chosen.

Optimize for:

- Scalability
- Performance
- Security
- Maintainability
- Data Integrity
- Multi-Tenant SaaS
- Future Expansion

------------------------------------------------------------

PRODUCT

Name

AccessGuard

Category

AI-powered Web Accessibility Compliance Platform

Purpose

Scan websites.

Detect accessibility issues.

Generate AI fixes.

Track compliance.

Create GitHub pull requests.

Generate reports.

Support enterprise organizations.

------------------------------------------------------------

Generate the COMPLETE DATABASE DESIGN.

------------------------------------------------------------

# 1

Database Overview

Why PostgreSQL?

Alternatives considered.

Scaling strategy.

------------------------------------------------------------

# 2

ER Diagram

Generate Mermaid ER Diagram.

------------------------------------------------------------

# 3

Complete Table List

Include EVERY table required.

Examples:

Users

Organizations

Teams

Workspaces

Projects

Websites

Pages

Scans

Violations

Violation Evidence

AI Suggestions

AI Prompt History

AI Responses

Reports

Audit Logs

Notifications

API Keys

Sessions

Invitations

Integrations

GitHub Connections

Repositories

Pull Requests

Commits

Schedules

Jobs

Queue Status

Feature Flags

Subscriptions

Invoices

Payments

Coupons

Usage Metrics

Analytics Events

Security Events

System Logs

Webhooks

Support Tickets

------------------------------------------------------------

# 4

For EVERY table include:

Purpose

Columns

Data Type

Nullable

Default

Constraints

Validation Rules

Indexes

Unique Constraints

Foreign Keys

Check Constraints

Soft Delete Strategy

Created At

Updated At

Deleted At

------------------------------------------------------------

# 5

Relationships

One-to-One

One-to-Many

Many-to-Many

Cascade Rules

Delete Rules

------------------------------------------------------------

# 6

Multi-Tenant Design

Organization Isolation

Workspace Isolation

Tenant IDs

Security Rules

------------------------------------------------------------

# 7

Authentication

Users

Sessions

OAuth

Refresh Tokens

MFA

Password Reset

Magic Links

------------------------------------------------------------

# 8

Authorization

RBAC

Permissions

Roles

Custom Roles

Role Hierarchy

------------------------------------------------------------

# 9

Accessibility Data

Scans

Violations

Severity

Evidence

Screenshots

DOM Snapshots

WCAG Rules

Issue History

Regression Tracking

------------------------------------------------------------

# 10

AI Tables

Prompt Versions

Prompt Templates

Model Versions

Inference History

Confidence Scores

Review Status

Human Approval

------------------------------------------------------------

# 11

Git Integrations

Repositories

Branches

Commits

PRs

Sync Logs

Webhooks

------------------------------------------------------------

# 12

Reports

Compliance Reports

Executive Reports

Legal Reports

Historical Reports

------------------------------------------------------------

# 13

Analytics

Events

Usage

Feature Usage

Performance

Error Tracking

------------------------------------------------------------

# 14

Notifications

Email

Slack

Teams

Browser

Webhook

------------------------------------------------------------

# 15

Billing

Plans

Subscriptions

Invoices

Payments

Usage Billing

Trials

------------------------------------------------------------

# 16

Indexes

Primary Keys

Composite Indexes

GIN Indexes

JSONB Indexes

Partial Indexes

Search Optimization

------------------------------------------------------------

# 17

Performance

Partitioning

Read Replicas

Connection Pooling

Archiving

Compression

------------------------------------------------------------

# 18

Data Retention

Retention Policies

Deletion Policies

GDPR Delete

Restore Strategy

------------------------------------------------------------

# 19

Security

Encryption

Sensitive Fields

Audit Logs

Secrets

API Keys

------------------------------------------------------------

# 20

Migration Strategy

Schema Versioning

Zero Downtime

Rollback

Forward Compatibility

------------------------------------------------------------

# 21

Future Expansion

Plugin Support

Marketplace

Enterprise Features

White Label

Multi Region

------------------------------------------------------------

# 22

Generate

Complete SQL DDL

PostgreSQL

CREATE TABLE statements

Indexes

Foreign Keys

Constraints

------------------------------------------------------------

# 23

Generate

Prisma Schema

------------------------------------------------------------

# 24

Generate

Drizzle ORM Schema

------------------------------------------------------------

# 25

Generate

Seed Data

Demo Organization

Demo Users

Demo Websites

Demo Scan Results

------------------------------------------------------------

Formatting

Return professional Markdown.

Include Mermaid ER diagrams.

Include SQL.

Include Prisma schema.

Include Drizzle schema.

Use tables extensively.

Explain WHY every table exists.

Target output:

25,000+ words.

Design for enterprise SaaS.

Do not omit any entity.

## Implementation Status (2026-08-01)

- Schema (Prisma 6 + PostgreSQL) covers all core tables: users, organizations, members, projects, scans, violations, WCAG rules, reports, audit logs, scheduled scans, billing, and GitHub PR tracking.
- Soft deletes (`deletedAt`) implemented on Project, Scan, Violation, and ComplianceReport.
- 14 CHECK constraints defined in `prisma/check-constraints.sql`, applied via `npm run db:constraints` and wired into CI.
- Composite indexes present on high-traffic query paths.
- ERD documented at `docs/design/enterprise-db-architecture/ERD.md`.
- Demo seed ships WCAG rules plus a demo project/scan/violations set.
- JSON string columns remain in place where the legacy design used them.
- Not yet implemented: partitioning, read replicas, GIN/JSONB indexes, and archiving jobs. Design for partitioning/read replicas/archiving documented at `docs/design/enterprise-db-architecture/PARTITIONING.md`; schema is partitioning-ready (see that doc §4).