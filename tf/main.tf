#
# lozotics2:  azure deployment to support lozotics apps
#

# Configure the Azure provider
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0.2"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.15.0"
    }
  }

  required_version = ">= 1.1.0"
}

# use a dedicated subscription: 'loopool'
provider "azurerm" {
  features {}

  subscription_id = "0f3ecc7d-4f08-4175-8810-6075218e9f40"
}

provider "azuread" {
  features {}
}

# Create a resource group
resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.primary_region
}

# Create a primary virtual network
resource "azurerm_virtual_network" "vnet" {
  name                = var.primary_vnet_name
  address_space       = ["10.0.0.0/16"]
  location            = var.primary_region
  resource_group_name = var.resource_group_name
  depends_on = [azurerm_resource_group.rg]
}

# create external and internal-facing subnets
resource "azurerm_subnet" "ext_subnet" {
  name                = var.primary_ext_subnet_name
  resource_group_name = var.resource_group_name
  virtual_network_name = var.primary_vnet_name
  address_prefixes    = ["10.0.1.0/24"] 
  depends_on = [azurerm_virtual_network.vnet]
}

resource "azurerm_subnet" "int_subnet" {
  name                = var.primary_int_subnet_name
  resource_group_name = var.resource_group_name
  virtual_network_name = var.primary_vnet_name
  address_prefixes    = ["10.0.2.0/24"] 
  depends_on = [azurerm_virtual_network.vnet]
}

# create nsg for external subnet
resource "azurerm_network_security_group" "ext_nsg" {
  name                = var.primary_ext_nsg_name
  location            = var.primary_region
  resource_group_name = var.resource_group_name 

  security_rule {
    name                       = "http"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }  
  security_rule {
    name                       = "https"
    priority                   = 200
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }  
  security_rule {
    name                       = "gateway-reserved"
    priority                   = 400
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_ranges         = ["65200-65535"]
    destination_port_ranges    = ["65200-65535"]
    source_address_prefix      = "GatewayManager"
    destination_address_prefix = "*"
  }  
  security_rule {
    name                       = "lb-reserved"
    priority                   = 401
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "AzureLoadBalancer"
    destination_address_prefix = "*"
  }  
  depends_on = [azurerm_virtual_network.vnet]
}

# associate with ext subnet
resource "azurerm_subnet_network_security_group_association" "ext_nsg_assn" {
  subnet_id = azurerm_subnet.ext_subnet.id
  network_security_group_id = azurerm_network_security_group.ext_nsg.id
  depends_on = [azurerm_network_security_group.ext_nsg]
}

# create k8s cluster in internal subnet
resource "azurerm_kubernetes_cluster" "loopool_aks" {
  name                = "loopool_aks"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  dns_prefix          = "loopoolaks"

  network_profile {
    service_cidr    = "10.0.7.0/24"
    dns_service_ip  = "10.0.7.10"
    docker_bridge_cidr  = "172.17.0.1/16"

    network_plugin      = "azure"
  }

  default_node_pool {
    name            = "default"
    node_count      = 1
    vm_size         = "Standard_B2s"
    os_disk_size_gb = 30
    vnet_subnet_id  = azurerm_subnet.int_subnet.id
  }

  identity {
    type = "SystemAssigned"
  }

  http_application_routing_enabled = true

  tags = {
    environment = "production"
  }

  depends_on = [azurerm_subnet.ext_subnet, azurerm_subnet.int_subnet]
}

#
# node pools for workloads
resource "azurerm_kubernetes_cluster_node_pool" "loopool_command_nodepool" {
  name                  = "commandpool"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.loopool_aks.id
  vm_size               = "Standard_DS2_v2"

  node_count            = 3

  node_labels = {
    workload_type = "command"
  }

  tags = {
    environment = "production"
  }
}

resource "azurerm_kubernetes_cluster_node_pool" "loopool_query_nodepool" {
  name                  = "querypool"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.loopool_aks.id
  vm_size               = "Standard_DS2_v2"

  node_count            = 1

  node_labels = {
    workload_type = "query"
  }

  tags = {
    environment = "production"
  }
}

#
# cosmos db
# create mongoDB type account
resource "azurerm_cosmosdb_account" "loopool_cosmos" {
  name                      = var.cosmosdb_account_name
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  offer_type                = "Standard"
  kind                      = "MongoDB"

  enable_automatic_failover = false

  #
  # enable this asap
#  public_network_access_enabled = false

  geo_location {
    location          = var.primary_region
    failover_priority = 0
  }

  consistency_policy {
    consistency_level       = "BoundedStaleness"
    max_interval_in_seconds = 300
    max_staleness_prefix    = 100000
  }

  /*
  backup {
    type                    = "Periodic"
    interval_in_minutes     = 1440
    retention_in_hours      = 108
    storage_redundancy      = "Zone"
  }
  */

  depends_on = [
    azurerm_resource_group.rg
  ]
}

output "clusterDNSZone" {
  value     = azurerm_kubernetes_cluster.loopool_aks.http_application_routing_zone_name
  sensitive = false
}

output "cosmosConnectionStrings" {
  value     = nonsensitive(azurerm_cosmosdb_account.loopool_cosmos.connection_strings)
  sensitive = false
}

/*
# bastion - deploy in prod only, expensive
#
# create bastion
resource "azurerm_subnet" "bastion_subnet" {
  name                = "AzureBastionSubnet"
  resource_group_name = var.resource_group_name
  virtual_network_name = var.primary_vnet_name
  address_prefixes    = ["10.0.3.0/24"] 
  depends_on = [azurerm_virtual_network.vnet]
}

resource "azurerm_public_ip" "bastion_ip" {
  name                = "lozotics_bastionip"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  allocation_method   = "Static"
  sku                 = "Standard"
  depends_on = [azurerm_resource_group.rg]
}

resource "azurerm_bastion_host" "bastion_host" {
  name                = "lozotics_bastionhost"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  ip_configuration {
    name                 = "bastionconfiguration"
    subnet_id            = azurerm_subnet.bastion_subnet.id
    public_ip_address_id = azurerm_public_ip.bastion_ip.id
  }
  depends_on = [azurerm_subnet.bastion_subnet]
}
*/

/*
# create test vm in internal subnet

# vm requires a nic in the azurerm provider
resource "azurerm_network_interface" "int_vm1_nic" {
  name                = "lozotics-int-vm1-nic"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  ip_configuration {
    name                          = "internal-int-vm1-nic"
    subnet_id                     = azurerm_subnet.int_subnet.id
    private_ip_address_allocation = "Dynamic"
  }
  depends_on = [azurerm_resource_group.rg]
}

resource "azurerm_linux_virtual_machine" "int_vm1" {
  name                = "lozotics-int-vm1"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  size                = "Standard_B2s"

  admin_username      = "azureuser"
  admin_password      = "Lozotics123"
  disable_password_authentication = false

  network_interface_ids = [
    azurerm_network_interface.int_vm1_nic.id,
  ]

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }

  source_image_reference {
    publisher = "canonical"
    offer     = "0001-com-ubuntu-server-focal"
    sku       = "20_04-lts-gen2"
    version   = "latest"
  }
  depends_on = [azurerm_network_interface.int_vm1_nic]
}
*/