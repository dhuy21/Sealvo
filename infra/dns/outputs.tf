output "name_servers" {
  description = "The four Route 53 name servers saved at Dynadot."
  value       = aws_route53_zone.sealvo.name_servers
}

output "zone_id" {
  value = aws_route53_zone.sealvo.zone_id
}
