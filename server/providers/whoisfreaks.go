package providers

import (
	"dmainwhoseek/types"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"os"
	"time"
)

type WhoisFreaksResponse struct {
	Status           bool   `json:"status"`
	DomainName       string `json:"domain_name"`
	DomainRegistered string `json:"domain_registered"`
	CreateDate       string `json:"create_date"`
	UpdateDate       string `json:"update_date"`
	ExpiryDate       string `json:"expiry_date"`
	DomainRegistrar  struct {
		RegistrarName string `json:"registrar_name"`
	} `json:"domain_registrar"`
	NameServers  []string `json:"name_servers"`
	DomainStatus []string `json:"domain_status"`
}

type WhoisFreaksProvider struct {
	apiKey string
}

func NewWhoisFreaksProvider() *WhoisFreaksProvider {
	return &WhoisFreaksProvider{
		apiKey: os.Getenv("WHOISFREAKS_API_KEY"),
	}
}

func (p *WhoisFreaksProvider) Name() string {
	return "WhoisFreaks"
}

func (p *WhoisFreaksProvider) queryAPI(domain string) (*types.WhoisResponse, error) {
	apiURL := fmt.Sprintf("https://api.whoisfreaks.com/v1.0/whois?apiKey=%s&whois=live&domainName=%s",
		url.QueryEscape(p.apiKey),
		url.QueryEscape(domain))

	client := &http.Client{Timeout: 30 * time.Second}
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("create request failed: %v", err)
	}

	req.Header.Set("User-Agent", "DomainWhoseek/1.0")
	resp, err := client.Do(req)
	if err != nil {
		if os.IsTimeout(err) {
			return nil, fmt.Errorf("API request timeout: %v", err)
		}
		return nil, fmt.Errorf("API request failed: %v", err)
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response failed: %v", err)
	}

	var whoisResp WhoisFreaksResponse
	if err := json.Unmarshal(body, &whoisResp); err != nil {
		return nil, fmt.Errorf("parse response failed: %v", err)
	}

	return &types.WhoisResponse{
		Available:   whoisResp.DomainRegistered != "yes",
		Domain:      whoisResp.DomainName,
		Registrar:   whoisResp.DomainRegistrar.RegistrarName,
		CreateDate:  whoisResp.CreateDate,
		ExpiryDate:  whoisResp.ExpiryDate,
		Status:      whoisResp.DomainStatus,
		NameServers: whoisResp.NameServers,
		UpdateDate:  whoisResp.UpdateDate,
	}, nil
}

func (p *WhoisFreaksProvider) Query(domain string) (*types.WhoisResponse, error, bool) {
	log.Printf("使用 WhoisFreaks API 查询域名: %s", domain)
	response, err := p.queryAPI(domain)
	if err != nil {
		log.Printf("WhoisFreaks API 查询失败: %v", err)
	}
	return response, err, false
}
