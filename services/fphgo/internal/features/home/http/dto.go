package http

type NearbyConditionsResponse struct {
	LocationLabel string               `json:"locationLabel"`
	Source        string               `json:"source"`
	UpdatedAt     string               `json:"updatedAt,omitempty"`
	Cards         NearbyConditionCards `json:"cards"`
}

type NearbyConditionCards struct {
	Current    NearbyConditionCard `json:"current"`
	Visibility NearbyConditionCard `json:"visibility"`
	Temp       NearbyConditionCard `json:"temp"`
	Wind       NearbyConditionCard `json:"wind"`
	Sunrise    NearbyConditionCard `json:"sunrise"`
}

type NearbyConditionCard struct {
	Label      string `json:"label"`
	Value      string `json:"value"`
	Confidence string `json:"confidence"`
}
