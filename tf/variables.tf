variable "resource_group_name" {
  default = "loopool_rg"
}

variable "primary_region" {
  default = "westus3"
}

variable "secondary_region" {
  default = "centralus"
}

variable "primary_vnet_name" {
  default = "loopool_vnet"
}

variable "primary_ext_subnet_name" {
  default = "loopool_ext_subnet"
}

variable "primary_ext_nsg_name" {
  default = "loopool_ext_nsg"
}

variable "primary_int_subnet_name" {
  default = "loopool_int_subnet"
}

variable "cosmosdb_account_name" {
  default = "loopool-cosmos"
}
