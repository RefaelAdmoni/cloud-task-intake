# DevOps Home Assignment

## Overview

You are given an existing application repository.

Your task is to design, provision, deploy, and expose the application in a cloud environment using Infrastructure as Code.

The goal of this assignment is not to test memorization or syntax.

The goal is to evaluate:

- system understanding
- cloud reasoning
- infrastructure design
- deployment decisions
- security awareness
- operational thinking
- ability to explain tradeoffs


- Choose one cloud provider:
  - Azure
  - AWS
  - GCP

- Provision infrastructure using Terraform

- Deploy the application publicly

- Configure:
  - compute runtime
  - PostgreSQL
  - object storage
  - async queue/messaging
  - frontend hosting
  - CDN or edge delivery

- Configure CI/CD using GitHub Actions or GitLab CI

- Static cloud credentials should not be stored in CI/CD secrets

- Provide DNS instructions required for Cloudflare configuration

### Requirements

- One cloud provider:
  - Azure
  - AWS
  - GCP

- Provision infrastructure using Terraform

- Deploy the application publicly

- Configure:
  - compute runtime
  - PostgreSQL
  - object storage
  - async queue/messaging
  - frontend hosting + CDN or edge delivery

- Configure CI/CD using GitHub Actions or GitLab CI

- Static cloud credentials should not be stored in CI/CD secrets

- Provide DNS instructions required for Cloudflare configuration


The provided docker-compose.yml is intended for local development only.

You are expected to map the local services into appropriate managed cloud services to ensure reliability, stability and scalability.

Deploying the entire Compose stack onto a single VM is discouraged unless clearly justified.

### Deliverables

Submit:

- Terraform code in an `iac/` folder
- CI/CD pipeline configuration
- Public application URL
- DNS request document for Cloudflare
- Deployment instructions
- Short architecture explanation
- Security considerations
- Known limitations

### DNS / Cloudflare

The reviewer controls DNS.

You must provide a `dns-request.md` file containing all required DNS records and certificate validation records.

Include:

- record type
- record name
- target value
- whether Cloudflare proxy should be enabled or disabled
- any additional requirements needed for the deployment to function correctly