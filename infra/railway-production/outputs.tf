output "project_id" {
  value = railway_project.production.id
}

output "environment_id" {
  value = local.environment_id
}

output "api_url" {
  value = "https://${railway_service_domain.api.domain}"
}

output "web_railway_url" {
  description = "Temporary public URL used to prove /health before DNS changes."
  value       = "https://${railway_service_domain.web.domain}"
}

output "web_url" {
  value = "https://www.sealvo.it.com"
}

output "google_redirect_uri" {
  description = "Add this exact URI on the Google OAuth client before login works."
  value       = "https://${railway_service_domain.api.domain}/auth/google/callback"
}

output "web_dns_record" {
  description = "CNAME www.sealvo.it.com must use this value. Empty until attach_www is true."
  value       = var.attach_www ? railway_custom_domain.web[0].dns_record_value : ""
}

output "service_ids" {
  description = "Put these in the production GitHub environment after the first apply."
  value = {
    API       = railway_service.api.id
    Web       = railway_service.web.id
    Worker    = railway_service.worker.id
    Scheduler = railway_service.scheduler.id
    Backup    = railway_service.backup.id
  }
}
