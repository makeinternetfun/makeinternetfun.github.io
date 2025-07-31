# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a simple GitHub Pages static website for "Make Internet Fun Again" - a manifesto advocating for returning the internet to its creative, quirky, and joyful roots. The site consists of a single HTML page with a manifesto about reclaiming the internet from doom scrolling and click-baiting.

## Architecture

- **Static Site**: Single-page HTML website hosted on GitHub Pages
- **Domain**: Custom domain `makeinternetfunagain.com` configured via CNAME file
- **Hosting**: GitHub Pages (indicated by CNAME file and repository structure)

## Key Files

- `index.html`: Main webpage containing the manifesto content
- `styles.css`: All CSS styling for the website
- `CNAME`: GitHub Pages custom domain configuration for `makeinternetfunagain.com`

## Development

This is a static HTML website with no build process, dependencies, or development server required. Changes can be made directly to the HTML file and will be automatically deployed via GitHub Pages when pushed to the main branch.

To preview changes locally, simply open `index.html` in a web browser.

## Styling Guidelines

- **All CSS must be placed in `styles.css`** - do not use inline styles or `<style>` tags in HTML
- When making styling changes, always edit `styles.css` rather than adding styles to HTML files
- The site uses responsive design with mobile-first approach