# DNS only. The domain stays registered at Dynadot.
# These records are the ones this hosted zone serves. Dynadot already
# delegates to the four name servers in the name_servers output.
# www points at the Sealvo Production web service.
# api is the production API, same site as www so the refresh cookie is sent.

resource "aws_route53_zone" "sealvo" {
  name    = "sealvo.it.com"
  comment = "DNS for sealvo.it.com. Registration stays at Dynadot."
}

resource "aws_route53_record" "apex_txt" {
  zone_id = aws_route53_zone.sealvo.zone_id
  name    = "sealvo.it.com"
  type    = "TXT"
  ttl     = 600
  records = ["google-site-verification=OZEsFmuTBWpEDLjpGl9KSACGVYFIGOQ9Kvydxn-fMiU"]
}

resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.sealvo.zone_id
  name    = "www.sealvo.it.com"
  type    = "CNAME"
  ttl     = 600
  records = ["emob4ie6.up.railway.app"]
}

resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.sealvo.zone_id
  name    = "api.sealvo.it.com"
  type    = "CNAME"
  ttl     = 600
  records = ["cznnxn1u.up.railway.app"]
}

resource "aws_route53_record" "api_verify" {
  zone_id = aws_route53_zone.sealvo.zone_id
  name    = "_railway-verify.api.sealvo.it.com"
  type    = "TXT"
  ttl     = 600
  records = ["railway-verify=c5a161eceea95b3a70e4d106064c2218d46fdca52cea5558ba0bed02a5d46500"]
}

resource "aws_route53_record" "www_verify" {
  zone_id = aws_route53_zone.sealvo.zone_id
  name    = "_railway-verify.www.sealvo.it.com"
  type    = "TXT"
  ttl     = 600
  records = ["railway-verify=8d90aa040c6bbb89ee7b40bd3eeb49137dfeddff6b69cb57af4304f84a3a3055"]
}

resource "aws_route53_record" "apex_mx" {
  zone_id = aws_route53_zone.sealvo.zone_id
  name    = "sealvo.it.com"
  type    = "MX"
  ttl     = 600
  records = ["10 feedback-smtp.eu-west-1.amazonses.com"]
}

resource "aws_route53_record" "mail_mx" {
  zone_id = aws_route53_zone.sealvo.zone_id
  name    = "mail.sealvo.it.com"
  type    = "MX"
  ttl     = 600
  records = ["10 feedback-smtp.eu-north-1.amazonses.com"]
}

resource "aws_route53_record" "mail_txt" {
  zone_id = aws_route53_zone.sealvo.zone_id
  name    = "mail.sealvo.it.com"
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com ~all"]
}

resource "aws_route53_record" "dmarc" {
  zone_id = aws_route53_zone.sealvo.zone_id
  name    = "_dmarc.sealvo.it.com"
  type    = "TXT"
  ttl     = 600
  records = ["v=DMARC1; p=none;"]
}

resource "aws_route53_record" "dkim" {
  for_each = {
    pmpjllonf2xxprsgw2giuni5ubb23jxm = "pmpjllonf2xxprsgw2giuni5ubb23jxm.dkim.amazonses.com"
    xsi5grqns7wdkvws3cmvmhooigfvr2ho = "xsi5grqns7wdkvws3cmvmhooigfvr2ho.dkim.amazonses.com"
    xeur57zm3dczpcpt3p5mvqrtntgsd52m = "xeur57zm3dczpcpt3p5mvqrtntgsd52m.dkim.amazonses.com"
  }
  zone_id = aws_route53_zone.sealvo.zone_id
  name    = "${each.key}._domainkey.sealvo.it.com"
  type    = "CNAME"
  ttl     = 600
  records = [each.value]
}
