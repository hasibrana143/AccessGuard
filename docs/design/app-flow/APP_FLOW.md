# ROLE

You are a Principal UX Architect, Product Designer, and Product Manager with 15+ years of experience designing enterprise SaaS products such as GitHub, Atlassian, Linear, Vercel, Stripe, Notion, Figma, and Datadog.

Your job is to create a COMPLETE APP FLOW DOCUMENT for AccessGuard.

Think like a UX Lead, Product Manager, Frontend Architect, and Enterprise SaaS Designer.

Do NOT skip any screens.

Do NOT make assumptions without documenting them.

Every screen should have a clear purpose, entry point, exit point, actions, permissions, loading states, empty states, success states, and error states.

The document must be detailed enough that designers and developers can build the complete application without additional clarification.

----------------------------------------------------

PRODUCT

Product Name:
AccessGuard

Category:
AI-Powered Web Accessibility Compliance Platform

Goal:

Help development teams scan websites, detect WCAG accessibility issues, generate AI-powered code fixes, create GitHub pull requests, monitor compliance, and produce compliance reports.

----------------------------------------------------

Generate the COMPLETE APPLICATION FLOW.

Include:

# 1

Complete Information Architecture

- Site Map
- Navigation Hierarchy
- User Journey Map

----------------------------------------------------

# 2

Authentication Flow

Landing

↓

Sign Up

↓

Email Verification

↓

Login

↓

Forgot Password

↓

Reset Password

↓

MFA

↓

Organization Creation

↓

Workspace Selection

↓

Dashboard

----------------------------------------------------

# 3

Onboarding Flow

Every onboarding step

Progress indicator

Skip logic

Workspace creation

Website connection

GitHub connection

First scan

Tutorial

Completion

----------------------------------------------------

# 4

Dashboard Flow

Every widget

Every card

Every chart

Every interaction

Quick actions

Recent scans

Notifications

----------------------------------------------------

# 5

Website Management

Create Website

Edit Website

Delete Website

Archive

Bulk Import

Domain Verification

----------------------------------------------------

# 6

Scanner Flow

New Scan

Schedule Scan

Real-time Scan

Progress

Queue

Completion

Failure

Retry

----------------------------------------------------

# 7

Violation Flow

Severity

Category

Filtering

Grouping

Search

Sorting

Screenshots

Code snippets

Evidence

----------------------------------------------------

# 8

AI Remediation Flow

Open Issue

Generate Fix

Review

Regenerate

Approve

Reject

Copy

Create GitHub PR

Track PR

Merge

Rescan

----------------------------------------------------

# 9

GitHub Integration

OAuth

Repository Selection

Branch Selection

Commit

Pull Request

Review

Merge

Sync

----------------------------------------------------

# 10

Reports

Generate

Download

Export

Share

Legal Report

Audit Report

Executive Summary

----------------------------------------------------

# 11

Analytics

Charts

Historical Trends

Accessibility Score

Regression Detection

AI Fix Rate

Compliance Trends

----------------------------------------------------

# 12

Notifications

Email

Slack

Teams

Webhook

Browser

Mobile

----------------------------------------------------

# 13

Billing

Plans

Upgrade

Downgrade

Invoices

Coupons

Usage

----------------------------------------------------

# 14

Team Management

Invite

Remove

Roles

Permissions

Organizations

Workspaces

----------------------------------------------------

# 15

Settings

Profile

Security

API Keys

Integrations

Preferences

Appearance

Audit Logs

----------------------------------------------------

# 16

Admin Panel

User Management

Organization Management

System Health

Feature Flags

Logs

Usage Analytics

----------------------------------------------------

# 17

Error Flows

404

403

500

API Errors

Timeouts

Scan Failures

Payment Failures

GitHub Errors

----------------------------------------------------

# 18

Edge Cases

Network Failure

Website Offline

Large Websites

Duplicate Websites

Expired Sessions

Permission Denied

Rate Limits

----------------------------------------------------

# 19

Every Screen

For EVERY screen include:

Purpose

Entry Point

Exit Point

Navigation

Primary CTA

Secondary CTA

Components

Forms

Validation

Loading State

Empty State

Success State

Error State

Permissions

Keyboard Navigation

Accessibility Requirements

Analytics Events

----------------------------------------------------

# 20

Navigation Diagram

Generate Mermaid diagrams for:

Authentication Flow

Main Navigation

Scanning Flow

AI Fix Flow

Reporting Flow

----------------------------------------------------

Formatting

Return professional Markdown.

Use tables.

Use Mermaid diagrams.

Use numbered sections.

Target length:

15,000–20,000 words.

Do not omit any screen.

Design for production SaaS.

## Implementation Status (2026-08-01)

- Auth flow implemented end-to-end: signup, login, MFA, email verification, password reset, organization creation, workspace selection.
- Onboarding wizard implemented.
- Dashboard widgets live: risk score, severity pie chart, trend chart, recent scans, and recent violations.
- Website management implemented: create/edit/delete, bulk import, and domain verification.
- Scanner flow live: real-time progress via SSE, BullMQ+Redis queue, and retry on failed scans (retry button + `errorMessage` display).
- Violations flow implemented: filtering/grouping, bulk status updates, remediation preview, and GitHub PR generation.
- Reports flow implemented: WCAG/VPAT/executive generation and download.
- Settings screens implemented: plan, notifications, team members (invites/roles), and billing (Stripe).
- Quick wins delivered: notifications dropdown in header (fed by audit logs) and help button.
- Not yet implemented: Slack/Teams/webhook/mobile notification channels and full admin panel.
