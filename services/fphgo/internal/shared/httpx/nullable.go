package httpx

import "encoding/json"

type NullableString struct {
	Set   bool
	Value *string
}

func (n *NullableString) UnmarshalJSON(data []byte) error {
	n.Set = true
	if string(data) == "null" {
		n.Value = nil
		return nil
	}
	var value string
	if err := json.Unmarshal(data, &value); err != nil {
		return err
	}
	n.Value = &value
	return nil
}

func (n NullableString) PtrOrEmptyForNull() *string {
	if !n.Set {
		return nil
	}
	if n.Value == nil {
		empty := ""
		return &empty
	}
	return n.Value
}
