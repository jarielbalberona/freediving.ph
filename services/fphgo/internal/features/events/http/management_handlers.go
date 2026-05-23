package http

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	eventsrepo "fphgo/internal/features/events/repo"
	"fphgo/internal/shared/httpx"
	"fphgo/internal/shared/mediaurl"
)

func (h *Handlers) ListCompetitions(w http.ResponseWriter, r *http.Request) {
	items, err := h.service.ListCompetitions(r.Context(), chi.URLParam(r, "eventId"), optionalActorID(r))
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, ListCompetitionsResponse{Competitions: mapCompetitions(items)})
}

func (h *Handlers) CreateCompetition(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[CreateCompetitionRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	item, err := h.service.CreateCompetition(r.Context(), chi.URLParam(r, "eventId"), actorID, eventsrepo.CreateCompetitionInput{
		Name:                req.Name,
		DescriptionMarkdown: req.DescriptionMarkdown,
		RulesMarkdown:       req.RulesMarkdown,
		SortOrder:           req.SortOrder,
	})
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, CompetitionResponse{Competition: mapCompetition(item)})
}

func (h *Handlers) UpdateCompetition(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[UpdateCompetitionRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	item, err := h.service.UpdateCompetition(r.Context(), chi.URLParam(r, "eventId"), chi.URLParam(r, "competitionId"), actorID, eventsrepo.UpdateCompetitionInput{
		Name:                req.Name,
		DescriptionMarkdown: req.DescriptionMarkdown,
		RulesMarkdown:       req.RulesMarkdown,
		SortOrder:           req.SortOrder,
	})
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, CompetitionResponse{Competition: mapCompetition(item)})
}

func (h *Handlers) DeleteCompetition(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	if err := h.service.DeleteCompetition(r.Context(), chi.URLParam(r, "eventId"), chi.URLParam(r, "competitionId"), actorID); err != nil {
		handleError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) ListPrizes(w http.ResponseWriter, r *http.Request) {
	items, err := h.service.ListPrizes(r.Context(), chi.URLParam(r, "eventId"), optionalActorID(r))
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, ListPrizesResponse{Prizes: mapPrizes(items)})
}

func (h *Handlers) CreatePrize(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[CreatePrizeRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	item, err := h.service.CreatePrize(r.Context(), chi.URLParam(r, "eventId"), actorID, eventsrepo.CreatePrizeInput{
		CompetitionID:       req.CompetitionID,
		Title:               req.Title,
		DescriptionMarkdown: req.DescriptionMarkdown,
		Placement:           req.Placement,
		PlacementLabel:      req.PlacementLabel,
		PrizeType:           req.PrizeType,
		Amount:              req.Amount,
		Currency:            req.Currency,
		SponsorID:           req.SponsorID,
		SortOrder:           req.SortOrder,
	})
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, PrizeResponse{Prize: mapPrize(item)})
}

func (h *Handlers) UpdatePrize(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[UpdatePrizeRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	item, err := h.service.UpdatePrize(r.Context(), chi.URLParam(r, "eventId"), chi.URLParam(r, "prizeId"), actorID, eventsrepo.UpdatePrizeInput{
		CompetitionID:       req.CompetitionID,
		Title:               req.Title,
		DescriptionMarkdown: req.DescriptionMarkdown,
		Placement:           req.Placement,
		PlacementLabel:      req.PlacementLabel,
		PrizeType:           req.PrizeType,
		Amount:              req.Amount,
		Currency:            req.Currency,
		SponsorID:           req.SponsorID,
		SortOrder:           req.SortOrder,
	})
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, PrizeResponse{Prize: mapPrize(item)})
}

func (h *Handlers) DeletePrize(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	if err := h.service.DeletePrize(r.Context(), chi.URLParam(r, "eventId"), chi.URLParam(r, "prizeId"), actorID); err != nil {
		handleError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) ListSponsors(w http.ResponseWriter, r *http.Request) {
	items, err := h.service.ListSponsors(r.Context(), chi.URLParam(r, "eventId"), optionalActorID(r))
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, ListSponsorsResponse{Sponsors: mapSponsors(items)})
}

func (h *Handlers) CreateSponsor(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[CreateSponsorRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	item, err := h.service.CreateSponsor(r.Context(), chi.URLParam(r, "eventId"), actorID, eventsrepo.CreateSponsorInput{
		Name:         req.Name,
		Tier:         req.Tier,
		Description:  req.Description,
		LogoMediaID:  req.LogoMediaID,
		WebsiteURL:   req.WebsiteURL,
		SocialURL:    req.SocialURL,
		ContactName:  req.ContactName,
		ContactEmail: req.ContactEmail,
		SortOrder:    req.SortOrder,
		IsActive:     isActive,
	})
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, SponsorResponse{Sponsor: mapSponsor(item)})
}

func (h *Handlers) UpdateSponsor(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[UpdateSponsorRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	item, err := h.service.UpdateSponsor(r.Context(), chi.URLParam(r, "eventId"), chi.URLParam(r, "sponsorId"), actorID, eventsrepo.UpdateSponsorInput{
		Name:         req.Name,
		Tier:         req.Tier,
		Description:  req.Description,
		LogoMediaID:  req.LogoMediaID,
		WebsiteURL:   req.WebsiteURL,
		SocialURL:    req.SocialURL,
		ContactName:  req.ContactName,
		ContactEmail: req.ContactEmail,
		SortOrder:    req.SortOrder,
		IsActive:     req.IsActive,
	})
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, SponsorResponse{Sponsor: mapSponsor(item)})
}

func (h *Handlers) DeleteSponsor(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	if err := h.service.DeleteSponsor(r.Context(), chi.URLParam(r, "eventId"), chi.URLParam(r, "sponsorId"), actorID); err != nil {
		handleError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) ListPosts(w http.ResponseWriter, r *http.Request) {
	items, err := h.service.ListPosts(r.Context(), chi.URLParam(r, "eventId"), optionalActorID(r))
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, ListPostsResponse{Posts: mapPosts(items)})
}

func (h *Handlers) CreatePost(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[CreatePostRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	item, err := h.service.CreatePost(r.Context(), chi.URLParam(r, "eventId"), actorID, eventsrepo.CreatePostInput{
		Title:        req.Title,
		BodyMarkdown: req.BodyMarkdown,
		IsPinned:     req.IsPinned,
	})
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, PostResponse{Post: mapPost(item)})
}

func (h *Handlers) UpdatePost(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[UpdatePostRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	item, err := h.service.UpdatePost(r.Context(), chi.URLParam(r, "eventId"), chi.URLParam(r, "postId"), actorID, eventsrepo.UpdatePostInput{
		Title:        req.Title,
		BodyMarkdown: req.BodyMarkdown,
		Status:       req.Status,
		IsPinned:     req.IsPinned,
	})
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, PostResponse{Post: mapPost(item)})
}

func (h *Handlers) DeletePost(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	if err := h.service.DeletePost(r.Context(), chi.URLParam(r, "eventId"), chi.URLParam(r, "postId"), actorID); err != nil {
		handleError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) UpdatePostSettings(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[UpdatePostSettingsRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	event, err := h.service.UpdatePostSettings(r.Context(), chi.URLParam(r, "eventId"), actorID, req.PostsEnabled, req.PostCreatePolicy)
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, EventDetailResponse{Event: mapEvent(event)})
}

func (h *Handlers) UpdateParticipantRole(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[UpdateParticipantRoleRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	participant, err := h.service.UpdateParticipantRole(r.Context(), chi.URLParam(r, "eventId"), chi.URLParam(r, "participantId"), actorID, req.Role)
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, mapParticipant(participant, true))
}

func mapCompetitions(items []eventsrepo.EventCompetition) []EventCompetitionResponse {
	if len(items) == 0 {
		return nil
	}
	mapped := make([]EventCompetitionResponse, 0, len(items))
	for _, item := range items {
		mapped = append(mapped, mapCompetition(item))
	}
	return mapped
}

func mapCompetition(item eventsrepo.EventCompetition) EventCompetitionResponse {
	return EventCompetitionResponse{
		ID:                  item.ID,
		EventID:             item.EventID,
		Name:                item.Name,
		DescriptionMarkdown: item.DescriptionMarkdown,
		RulesMarkdown:       item.RulesMarkdown,
		SortOrder:           item.SortOrder,
		CreatedAt:           item.CreatedAt,
		UpdatedAt:           item.UpdatedAt,
	}
}

func mapPrizes(items []eventsrepo.EventPrize) []EventPrizeResponse {
	if len(items) == 0 {
		return nil
	}
	mapped := make([]EventPrizeResponse, 0, len(items))
	for _, item := range items {
		mapped = append(mapped, mapPrize(item))
	}
	return mapped
}

func mapPrize(item eventsrepo.EventPrize) EventPrizeResponse {
	return EventPrizeResponse{
		ID:                  item.ID,
		EventID:             item.EventID,
		CompetitionID:       item.CompetitionID,
		Title:               item.Title,
		DescriptionMarkdown: item.DescriptionMarkdown,
		Placement:           item.Placement,
		PlacementLabel:      item.PlacementLabel,
		PrizeType:           item.PrizeType,
		Amount:              item.Amount,
		Currency:            item.Currency,
		SponsorID:           item.SponsorID,
		SortOrder:           item.SortOrder,
		CreatedAt:           item.CreatedAt,
		UpdatedAt:           item.UpdatedAt,
	}
}

func mapSponsors(items []eventsrepo.EventSponsor) []EventSponsorResponse {
	if len(items) == 0 {
		return nil
	}
	mapped := make([]EventSponsorResponse, 0, len(items))
	for _, item := range items {
		mapped = append(mapped, mapSponsor(item))
	}
	return mapped
}

func mapSponsor(item eventsrepo.EventSponsor) EventSponsorResponse {
	return EventSponsorResponse{
		ID:           item.ID,
		EventID:      item.EventID,
		Name:         item.Name,
		Tier:         item.Tier,
		Description:  item.Description,
		LogoMediaID:  item.LogoMediaID,
		LogoURL:      mediaurl.MaterializeWithDefault(item.LogoURL),
		WebsiteURL:   item.WebsiteURL,
		SocialURL:    item.SocialURL,
		ContactName:  item.ContactName,
		ContactEmail: item.ContactEmail,
		SortOrder:    item.SortOrder,
		IsActive:     item.IsActive,
		CreatedAt:    item.CreatedAt,
		UpdatedAt:    item.UpdatedAt,
	}
}

func mapPosts(items []eventsrepo.EventPost) []EventPostResponse {
	if len(items) == 0 {
		return nil
	}
	mapped := make([]EventPostResponse, 0, len(items))
	for _, item := range items {
		mapped = append(mapped, mapPost(item))
	}
	return mapped
}

func mapPost(item eventsrepo.EventPost) EventPostResponse {
	return EventPostResponse{
		ID:                item.ID,
		EventID:           item.EventID,
		AuthorUserID:      item.AuthorUserID,
		Title:             item.Title,
		BodyMarkdown:      item.BodyMarkdown,
		Status:            item.Status,
		IsPinned:          item.IsPinned,
		AuthorDisplayName: item.AuthorDisplayName,
		AuthorUsername:    item.AuthorUsername,
		AuthorAvatarURL:   mediaurl.MaterializeWithDefault(item.AuthorAvatarURL),
		CreatedAt:         item.CreatedAt,
		UpdatedAt:         item.UpdatedAt,
	}
}
