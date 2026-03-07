package validatex

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestFromValidator_SimpleField(t *testing.T) {
	type Req struct {
		Name  string `json:"name"  validate:"required"`
		Email string `json:"email" validate:"required,email"`
	}

	v := New()
	err := v.Struct(Req{})
	if err == nil {
		t.Fatal("expected validation error")
	}

	ve, ok := FromValidator(err)
	if !ok {
		t.Fatal("expected FromValidator to succeed")
	}
	if len(ve.Issues) != 2 {
		t.Fatalf("expected 2 issues, got %d", len(ve.Issues))
	}

	byCode := map[string]Issue{}
	for _, issue := range ve.Issues {
		byCode[pathKey(issue.Path)] = issue
	}

	nameIssue, ok := byCode["name"]
	if !ok {
		t.Fatal("expected issue for 'name' path")
	}
	if nameIssue.Code != "required" {
		t.Fatalf("expected code 'required', got %q", nameIssue.Code)
	}

	emailIssue, ok := byCode["email"]
	if !ok {
		t.Fatal("expected issue for 'email' path")
	}
	if emailIssue.Code != "required" {
		t.Fatalf("expected code 'required', got %q", emailIssue.Code)
	}
}

func TestFromValidator_EmailTag(t *testing.T) {
	type Req struct {
		Email string `json:"email" validate:"required,email"`
	}

	v := New()
	err := v.Struct(Req{Email: "not-an-email"})
	if err == nil {
		t.Fatal("expected validation error")
	}

	ve, ok := FromValidator(err)
	if !ok {
		t.Fatal("expected FromValidator to succeed")
	}
	if len(ve.Issues) != 1 {
		t.Fatalf("expected 1 issue, got %d", len(ve.Issues))
	}
	if ve.Issues[0].Code != "invalid_email" {
		t.Fatalf("expected code 'invalid_email', got %q", ve.Issues[0].Code)
	}
	assertPath(t, ve.Issues[0].Path, "email")
}

func TestFromValidator_NestedStruct(t *testing.T) {
	type Profile struct {
		Username string `json:"username" validate:"required"`
	}
	type Req struct {
		Profile Profile `json:"profile" validate:"required"`
	}

	v := New()
	err := v.Struct(Req{Profile: Profile{}})
	if err == nil {
		t.Fatal("expected validation error")
	}

	ve, ok := FromValidator(err)
	if !ok {
		t.Fatal("expected FromValidator to succeed")
	}
	if len(ve.Issues) != 1 {
		t.Fatalf("expected 1 issue, got %d", len(ve.Issues))
	}
	assertPath(t, ve.Issues[0].Path, "profile", "username")
}

func TestFromValidator_ArrayField(t *testing.T) {
	type Item struct {
		Name string `json:"name" validate:"required"`
	}
	type Req struct {
		Items []Item `json:"items" validate:"dive"`
	}

	v := New()
	err := v.Struct(Req{Items: []Item{{Name: ""}}})
	if err == nil {
		t.Fatal("expected validation error")
	}

	ve, ok := FromValidator(err)
	if !ok {
		t.Fatal("expected FromValidator to succeed")
	}
	if len(ve.Issues) != 1 {
		t.Fatalf("expected 1 issue, got %d", len(ve.Issues))
	}
	assertPath(t, ve.Issues[0].Path, "items", "0", "name")
}

func TestFromJSONDecodeError_UnknownField(t *testing.T) {
	type Req struct {
		Name string `json:"name"`
	}

	dec := json.NewDecoder(strings.NewReader(`{"name":"ok","bogus":123}`))
	dec.DisallowUnknownFields()

	var dst Req
	err := dec.Decode(&dst)
	if err == nil {
		t.Fatal("expected decode error for unknown field")
	}

	ve, ok := FromJSONDecodeError(err)
	if !ok {
		t.Fatal("expected FromJSONDecodeError to succeed")
	}
	if len(ve.Issues) != 1 {
		t.Fatalf("expected 1 issue, got %d", len(ve.Issues))
	}
	if ve.Issues[0].Code != "unrecognized_key" {
		t.Fatalf("expected code 'unrecognized_key', got %q", ve.Issues[0].Code)
	}
	assertPath(t, ve.Issues[0].Path, "bogus")
}

func TestFromJSONDecodeError_TypeMismatch(t *testing.T) {
	type Req struct {
		Count int `json:"count"`
	}

	dec := json.NewDecoder(strings.NewReader(`{"count":"not_a_number"}`))
	dec.DisallowUnknownFields()

	var dst Req
	err := dec.Decode(&dst)
	if err == nil {
		t.Fatal("expected decode error for type mismatch")
	}

	ve, ok := FromJSONDecodeError(err)
	if !ok {
		t.Fatal("expected FromJSONDecodeError to succeed")
	}
	if len(ve.Issues) != 1 {
		t.Fatalf("expected 1 issue, got %d", len(ve.Issues))
	}
	if ve.Issues[0].Code != "invalid_type" {
		t.Fatalf("expected code 'invalid_type', got %q", ve.Issues[0].Code)
	}
	assertPath(t, ve.Issues[0].Path, "count")
}

func TestFromJSONDecodeError_SyntaxError(t *testing.T) {
	type Req struct {
		Name string `json:"name"`
	}

	dec := json.NewDecoder(strings.NewReader(`{broken json`))
	var dst Req
	err := dec.Decode(&dst)
	if err == nil {
		t.Fatal("expected decode error for syntax error")
	}

	_, ok := FromJSONDecodeError(err)
	if ok {
		t.Fatal("syntax errors should not be converted to validation issues")
	}
}

func TestFromValidator_TagMapping(t *testing.T) {
	type Req struct {
		ID    string `json:"id"    validate:"required,uuid"`
		URL   string `json:"url"   validate:"required,url"`
		Size  int    `json:"size"  validate:"min=1"`
		Role  string `json:"role"  validate:"required,oneof=admin member"`
		Count int    `json:"count" validate:"max=100"`
	}

	v := New()
	err := v.Struct(Req{
		ID:    "not-uuid",
		URL:   "not-url",
		Size:  0,
		Role:  "invalid",
		Count: 200,
	})
	if err == nil {
		t.Fatal("expected validation error")
	}

	ve, ok := FromValidator(err)
	if !ok {
		t.Fatal("expected FromValidator to succeed")
	}

	byPath := map[string]Issue{}
	for _, issue := range ve.Issues {
		byPath[pathKey(issue.Path)] = issue
	}

	expectations := map[string]string{
		"id":    "invalid_uuid",
		"url":   "invalid_url",
		"size":  "too_small",
		"role":  "invalid_enum",
		"count": "too_big",
	}
	for field, wantCode := range expectations {
		issue, ok := byPath[field]
		if !ok {
			t.Errorf("missing issue for field %q", field)
			continue
		}
		if issue.Code != wantCode {
			t.Errorf("field %q: expected code %q, got %q", field, wantCode, issue.Code)
		}
	}
}

func TestValidationError_ImplementsError(t *testing.T) {
	var err error = ValidationError{Issues: []Issue{{Code: "required", Message: "required"}}}
	if err.Error() == "" {
		t.Fatal("expected non-empty error string")
	}
}

func TestNamespaceToPath(t *testing.T) {
	tests := []struct {
		input string
		want  []string
	}{
		{"Struct.field", []string{"field"}},
		{"Struct.profile.username", []string{"profile", "username"}},
		{"Struct.items[0].name", []string{"items", "0", "name"}},
		{"Struct.matrix[0][1]", []string{"matrix", "0", "1"}},
		{"NoDotsHere", nil},
	}

	for _, tc := range tests {
		t.Run(tc.input, func(t *testing.T) {
			got := namespaceToPath(tc.input)
			if tc.want == nil {
				if len(got) != 0 {
					t.Fatalf("expected empty path, got %v", got)
				}
				return
			}
			if len(got) != len(tc.want) {
				t.Fatalf("expected path %v, got %v", tc.want, got)
			}
			for i, g := range got {
				if g != tc.want[i] {
					t.Fatalf("path[%d]: expected %q, got %v", i, tc.want[i], g)
				}
			}
		})
	}
}

func pathKey(path []any) string {
	parts := make([]string, len(path))
	for i, p := range path {
		parts[i] = p.(string)
	}
	return strings.Join(parts, ".")
}

func assertPath(t *testing.T, got []any, want ...string) {
	t.Helper()
	if len(got) != len(want) {
		t.Fatalf("expected path %v, got %v", want, got)
	}
	for i, w := range want {
		if got[i] != w {
			t.Fatalf("path[%d]: expected %q, got %v", i, w, got[i])
		}
	}
}
