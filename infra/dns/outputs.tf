output "name_servers" {
  description = "Enter these four at Dynadot under Name Servers, after this zone exists. Do not change them before the records above are applied."
  value       = aws_route53_zone.sealvo.name_servers
}

output "zone_id" {
  value = aws_route53_zone.sealvo.zone_id
}
