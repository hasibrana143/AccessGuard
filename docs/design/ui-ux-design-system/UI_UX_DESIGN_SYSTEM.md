# ROLE

You are a Principal Product Designer, Design System Architect, UX Researcher, and Creative Director with 15+ years of experience designing enterprise SaaS products such as GitHub, Linear, Stripe Dashboard, Notion, Vercel, Figma, Datadog, Atlassian, Slack, and GitLab.

You specialize in B2B SaaS platforms, developer tools, enterprise dashboards, and accessibility-first design systems.

Your task is to design the COMPLETE UI/UX DESIGN SYSTEM for AccessGuard.

This is NOT just a color palette.

This is a production-ready design specification that designers and frontend engineers can directly implement.

Design for desktop first.

Mobile responsive.

Accessibility-first.

WCAG AA compliant.

Modern.

Minimal.

Premium.

Developer-first.

------------------------------------------------------------

PRODUCT

Name:

AccessGuard

Category:

AI-powered Accessibility Compliance Platform

Audience:

• Developers
• Engineering Managers
• CTOs
• DevOps
• QA Teams
• Enterprise Customers

Brand Personality:

Professional

Intelligent

Secure

Reliable

Modern

Minimal

Premium

Developer-focused

Trustworthy

Technical

------------------------------------------------------------

Generate a COMPLETE DESIGN BRIEF

Include every section below.

------------------------------------------------------------

1.

Brand Identity

Mission

Vision

Core Values

Brand Voice

Personality

Design Principles

------------------------------------------------------------

2.

Design Mood

Describe the emotional feeling.

Examples:

Minimal

Technical

Elegant

Enterprise

Developer-first

Premium

Fast

Reliable

Confident

Modern

------------------------------------------------------------

3.

Visual Inspiration

Reference the visual style of products like:

GitHub

Linear

Vercel

Stripe Dashboard

Notion

Datadog

Figma

Atlassian

GitLab

Do NOT copy.

Only describe inspiration.

------------------------------------------------------------

4.

Color System

Primary

Secondary

Accent

Success

Warning

Danger

Info

Neutral

Background

Surface

Card

Sidebar

Border

Hover

Focus

Disabled

Charts

Dark Theme

Light Theme

Provide:

HEX

RGB

Usage

Accessibility Contrast

------------------------------------------------------------

5.

Typography

Heading Font

Body Font

Monospace Font

Fallback Fonts

Scale

H1

H2

H3

H4

Body

Caption

Label

Button

Code

Line Heights

Letter Spacing

Font Weight

------------------------------------------------------------

6.

Spacing System

4pt Grid

Spacing Tokens

Container Width

Section Spacing

Padding

Margins

Responsive Breakpoints

------------------------------------------------------------

7.

Border Radius

Small

Medium

Large

Cards

Buttons

Inputs

Dialogs

------------------------------------------------------------

8.

Elevation

Shadow Levels

Hover

Focus

Active

------------------------------------------------------------

9.

Icons

Recommended Icon Library

Sizing

Stroke Width

Usage Rules

------------------------------------------------------------

10.

Illustration Style

Empty States

Onboarding

Errors

Marketing

------------------------------------------------------------

11.

Animations

Duration

Timing

Hover

Transitions

Page Loading

Skeletons

Micro-interactions

------------------------------------------------------------

12.

Components

Buttons

Inputs

Text Areas

Checkbox

Radio

Toggle

Dropdown

Date Picker

Search

Tabs

Accordion

Toast

Snackbar

Modal

Drawer

Sidebar

Navbar

Footer

Breadcrumb

Pagination

Badge

Avatar

Tooltip

Cards

Stats Cards

Metric Cards

Progress Bars

Tables

Charts

Data Grid

Empty States

Error States

Loading States

------------------------------------------------------------

13.

Dashboard Design

Top Navigation

Sidebar

Widgets

Charts

KPIs

Recent Activity

Quick Actions

------------------------------------------------------------

14.

Landing Page

Hero

Problem

Solution

Features

Comparison

Pricing

Testimonials

FAQ

CTA

Footer

------------------------------------------------------------

15.

Accessibility

WCAG AA

Keyboard Navigation

Screen Readers

Focus States

Contrast Ratios

ARIA

Reduced Motion

------------------------------------------------------------

16.

Responsive Design

Desktop

Tablet

Mobile

Large Screens

------------------------------------------------------------

17.

Dark Mode

Complete dark theme specification.

------------------------------------------------------------

18.

Design Tokens

Generate tokens ready for Tailwind CSS.

------------------------------------------------------------

19.

Figma Organization

Pages

Components

Variables

Libraries

Auto Layout

Naming Convention

------------------------------------------------------------

20.

Developer Handoff

CSS Variables

Tailwind Mapping

Component Naming

Folder Structure

------------------------------------------------------------

21.

UI Copy Guidelines

Buttons

Labels

Errors

Empty States

Success Messages

------------------------------------------------------------

22.

Design QA Checklist

Accessibility

Responsiveness

Consistency

Performance

------------------------------------------------------------

Formatting

Return professional Markdown.

Use tables.

Use color palettes.

Include component hierarchy.

Explain every design decision.

Target output:

15,000+ words.

Do not skip any section.

Think like the Head of Design at a billion-dollar SaaS company.

## Implementation Status (2026-08-01)

- Design tokens implemented in `globals.css` via `@theme`, including elevation tokens `--elevation-1/2/3`.
- Card, dialog, and sheet components use elevation shadow tokens.
- Skip-to-content link present; `focus-visible` rings applied across interactive elements.
- Reduced-motion support implemented (`prefers-reduced-motion`).
- Dark mode toggle implemented and functional.
- Landing, pricing, and dashboard pages are responsive across breakpoints.
- Charts (Recharts) updated with axe-found contrast/label fixes.
- Icon buttons given accessible labels; page `h1` structure normalized.
- Keyboard navigation covered by automated tests.
- Axe-core a11y e2e suite (9 scans) covers landing, login, dashboard, projects, violations, and settings pages.
