package service

import (
	"context"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"

	eventsrepo "fphgo/internal/features/events/repo"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/validatex"
)

func (s *Service) ListProgramItems(ctx context.Context, eventID, viewerUserID string) ([]eventsrepo.EventProgramItem, error) {
	event, err := s.ensureCanViewEventDetails(ctx, eventID, viewerUserID)
	if err != nil {
		return nil, err
	}
	if !event.ViewerCanManage && !event.ProgramEnabled {
		return nil, apperrors.New(http.StatusForbidden, "forbidden", "event program is not enabled", nil)
	}
	items, err := s.repo.ListProgramItems(ctx, eventID)
	if err != nil {
		return nil, apperrors.New(http.StatusInternalServerError, "event_program_list_failed", "failed to list event program", err)
	}
	return items, nil
}

func (s *Service) CreateProgramItem(ctx context.Context, eventID, actorID string, input eventsrepo.CreateProgramItemInput) (eventsrepo.EventProgramItem, error) {
	if err := validateEventAndActor(eventID, actorID); err != nil {
		return eventsrepo.EventProgramItem{}, err
	}
	if err := s.ensureCanManage(ctx, eventID, actorID); err != nil {
		return eventsrepo.EventProgramItem{}, err
	}
	input = normalizeProgramInput(input)
	if err := validateCreateProgramInput(input); err != nil {
		return eventsrepo.EventProgramItem{}, err
	}
	if err := s.ensureProgramCompetitionBelongsToEvent(ctx, eventID, input.CompetitionID); err != nil {
		return eventsrepo.EventProgramItem{}, err
	}
	item, err := s.repo.CreateProgramItem(ctx, eventID, input)
	if err != nil {
		return eventsrepo.EventProgramItem{}, apperrors.New(http.StatusInternalServerError, "event_program_create_failed", "failed to create program item", err)
	}
	return item, nil
}

func (s *Service) UpdateProgramItem(ctx context.Context, eventID, programItemID, actorID string, input eventsrepo.UpdateProgramItemInput) (eventsrepo.EventProgramItem, error) {
	if err := validateEventAndActor(eventID, actorID); err != nil {
		return eventsrepo.EventProgramItem{}, err
	}
	if _, err := uuid.Parse(programItemID); err != nil {
		return eventsrepo.EventProgramItem{}, invalidUUID("programItemId")
	}
	if err := s.ensureCanManage(ctx, eventID, actorID); err != nil {
		return eventsrepo.EventProgramItem{}, err
	}
	input.ProgramItemID = programItemID
	normalizeUpdateProgramInput(&input)
	title := ""
	if input.Title != nil {
		title = *input.Title
		if title == "" {
			return eventsrepo.EventProgramItem{}, required("title")
		}
	}
	programDate := valueOrEmpty(input.ProgramDate)
	startTime := valueOrEmpty(input.StartTime)
	endTime := valueOrEmpty(input.EndTime)
	timezone := valueOrEmpty(input.Timezone)
	competitionID := valueOrEmpty(input.CompetitionID)
	if input.Title != nil || input.ProgramDate != nil || input.StartTime != nil || input.EndTime != nil || input.Timezone != nil || input.CompetitionID != nil {
		if err := validateProgramInput(title, programDate, startTime, endTime, timezone, competitionID); err != nil {
			return eventsrepo.EventProgramItem{}, err
		}
	}
	if err := s.ensureProgramCompetitionBelongsToEvent(ctx, eventID, competitionID); err != nil {
		return eventsrepo.EventProgramItem{}, err
	}
	item, err := s.repo.UpdateProgramItem(ctx, eventID, input)
	if err != nil {
		if eventsrepo.IsNoRows(err) {
			return eventsrepo.EventProgramItem{}, apperrors.New(http.StatusNotFound, "event_program_item_not_found", "program item not found", err)
		}
		return eventsrepo.EventProgramItem{}, apperrors.New(http.StatusInternalServerError, "event_program_update_failed", "failed to update program item", err)
	}
	return item, nil
}

func (s *Service) DeleteProgramItem(ctx context.Context, eventID, programItemID, actorID string) error {
	if err := validateEventAndActor(eventID, actorID); err != nil {
		return err
	}
	if _, err := uuid.Parse(programItemID); err != nil {
		return invalidUUID("programItemId")
	}
	if err := s.ensureCanManage(ctx, eventID, actorID); err != nil {
		return err
	}
	if err := s.repo.DeleteProgramItem(ctx, eventID, programItemID); err != nil {
		if eventsrepo.IsNoRows(err) {
			return apperrors.New(http.StatusNotFound, "event_program_item_not_found", "program item not found", err)
		}
		return apperrors.New(http.StatusInternalServerError, "event_program_delete_failed", "failed to delete program item", err)
	}
	return nil
}

func (s *Service) ListCompetitions(ctx context.Context, eventID, viewerUserID string) ([]eventsrepo.EventCompetition, error) {
	if _, err := s.ensureCanViewEventDetails(ctx, eventID, viewerUserID); err != nil {
		return nil, err
	}
	items, err := s.repo.ListCompetitions(ctx, eventID)
	if err != nil {
		return nil, apperrors.New(http.StatusInternalServerError, "event_competitions_list_failed", "failed to list event competitions", err)
	}
	return items, nil
}

func (s *Service) CreateCompetition(ctx context.Context, eventID, actorID string, input eventsrepo.CreateCompetitionInput) (eventsrepo.EventCompetition, error) {
	if err := validateEventAndActor(eventID, actorID); err != nil {
		return eventsrepo.EventCompetition{}, err
	}
	if err := s.ensureCanManage(ctx, eventID, actorID); err != nil {
		return eventsrepo.EventCompetition{}, err
	}
	input = normalizeCompetitionInput(input)
	if err := validateCompetitionFields(input.Name); err != nil {
		return eventsrepo.EventCompetition{}, err
	}
	item, err := s.repo.CreateCompetition(ctx, eventID, input)
	if err != nil {
		return eventsrepo.EventCompetition{}, apperrors.New(http.StatusInternalServerError, "event_competition_create_failed", "failed to create event competition", err)
	}
	return item, nil
}

func (s *Service) UpdateCompetition(ctx context.Context, eventID, competitionID, actorID string, input eventsrepo.UpdateCompetitionInput) (eventsrepo.EventCompetition, error) {
	if err := validateEventAndActor(eventID, actorID); err != nil {
		return eventsrepo.EventCompetition{}, err
	}
	if _, err := uuid.Parse(competitionID); err != nil {
		return eventsrepo.EventCompetition{}, invalidUUID("competitionId")
	}
	if err := s.ensureCanManage(ctx, eventID, actorID); err != nil {
		return eventsrepo.EventCompetition{}, err
	}
	input.CompetitionID = competitionID
	normalizeUpdateCompetitionInput(&input)
	if input.Name != nil {
		if err := validateCompetitionFields(*input.Name); err != nil {
			return eventsrepo.EventCompetition{}, err
		}
	}
	item, err := s.repo.UpdateCompetition(ctx, eventID, input)
	if err != nil {
		if eventsrepo.IsNoRows(err) {
			return eventsrepo.EventCompetition{}, apperrors.New(http.StatusNotFound, "event_competition_not_found", "event competition not found", err)
		}
		return eventsrepo.EventCompetition{}, apperrors.New(http.StatusInternalServerError, "event_competition_update_failed", "failed to update event competition", err)
	}
	return item, nil
}

func (s *Service) DeleteCompetition(ctx context.Context, eventID, competitionID, actorID string) error {
	if err := validateEventAndActor(eventID, actorID); err != nil {
		return err
	}
	if _, err := uuid.Parse(competitionID); err != nil {
		return invalidUUID("competitionId")
	}
	if err := s.ensureCanManage(ctx, eventID, actorID); err != nil {
		return err
	}
	if err := s.repo.DeleteCompetition(ctx, eventID, competitionID); err != nil {
		if eventsrepo.IsNoRows(err) {
			return apperrors.New(http.StatusNotFound, "event_competition_not_found", "event competition not found", err)
		}
		return apperrors.New(http.StatusInternalServerError, "event_competition_delete_failed", "failed to delete event competition", err)
	}
	return nil
}

func (s *Service) ListPrizes(ctx context.Context, eventID, viewerUserID string) ([]eventsrepo.EventPrize, error) {
	if _, err := s.ensureCanViewEventDetails(ctx, eventID, viewerUserID); err != nil {
		return nil, err
	}
	items, err := s.repo.ListPrizes(ctx, eventID)
	if err != nil {
		return nil, apperrors.New(http.StatusInternalServerError, "event_prizes_list_failed", "failed to list event prizes", err)
	}
	return items, nil
}

func (s *Service) CreatePrize(ctx context.Context, eventID, actorID string, input eventsrepo.CreatePrizeInput) (eventsrepo.EventPrize, error) {
	if err := validateEventAndActor(eventID, actorID); err != nil {
		return eventsrepo.EventPrize{}, err
	}
	if err := s.ensureCanManage(ctx, eventID, actorID); err != nil {
		return eventsrepo.EventPrize{}, err
	}
	input = normalizePrizeInput(input)
	if err := validatePrizeInput(input.Title, input.CompetitionID, input.SponsorID, input.Placement, input.PrizeType, input.Amount); err != nil {
		return eventsrepo.EventPrize{}, err
	}
	if err := s.ensurePrizeReferencesBelongToEvent(ctx, eventID, input.CompetitionID, input.SponsorID); err != nil {
		return eventsrepo.EventPrize{}, err
	}
	item, err := s.repo.CreatePrize(ctx, eventID, input)
	if err != nil {
		return eventsrepo.EventPrize{}, apperrors.New(http.StatusInternalServerError, "event_prize_create_failed", "failed to create event prize", err)
	}
	return item, nil
}

func (s *Service) UpdatePrize(ctx context.Context, eventID, prizeID, actorID string, input eventsrepo.UpdatePrizeInput) (eventsrepo.EventPrize, error) {
	if err := validateEventAndActor(eventID, actorID); err != nil {
		return eventsrepo.EventPrize{}, err
	}
	if _, err := uuid.Parse(prizeID); err != nil {
		return eventsrepo.EventPrize{}, invalidUUID("prizeId")
	}
	if err := s.ensureCanManage(ctx, eventID, actorID); err != nil {
		return eventsrepo.EventPrize{}, err
	}
	input.PrizeID = prizeID
	normalizeUpdatePrizeInput(&input)
	if err := validatePrizePatch(input); err != nil {
		return eventsrepo.EventPrize{}, err
	}
	competitionID := ""
	if input.CompetitionID != nil {
		competitionID = *input.CompetitionID
	}
	sponsorID := ""
	if input.SponsorID != nil {
		sponsorID = *input.SponsorID
	}
	if err := s.ensurePrizeReferencesBelongToEvent(ctx, eventID, competitionID, sponsorID); err != nil {
		return eventsrepo.EventPrize{}, err
	}
	item, err := s.repo.UpdatePrize(ctx, eventID, input)
	if err != nil {
		if eventsrepo.IsNoRows(err) {
			return eventsrepo.EventPrize{}, apperrors.New(http.StatusNotFound, "event_prize_not_found", "event prize not found", err)
		}
		return eventsrepo.EventPrize{}, apperrors.New(http.StatusInternalServerError, "event_prize_update_failed", "failed to update event prize", err)
	}
	return item, nil
}

func (s *Service) DeletePrize(ctx context.Context, eventID, prizeID, actorID string) error {
	if err := validateEventAndActor(eventID, actorID); err != nil {
		return err
	}
	if _, err := uuid.Parse(prizeID); err != nil {
		return invalidUUID("prizeId")
	}
	if err := s.ensureCanManage(ctx, eventID, actorID); err != nil {
		return err
	}
	if err := s.repo.DeletePrize(ctx, eventID, prizeID); err != nil {
		if eventsrepo.IsNoRows(err) {
			return apperrors.New(http.StatusNotFound, "event_prize_not_found", "event prize not found", err)
		}
		return apperrors.New(http.StatusInternalServerError, "event_prize_delete_failed", "failed to delete event prize", err)
	}
	return nil
}

func (s *Service) ListSponsors(ctx context.Context, eventID, viewerUserID string) ([]eventsrepo.EventSponsor, error) {
	event, err := s.ensureCanViewEventDetails(ctx, eventID, viewerUserID)
	if err != nil {
		return nil, err
	}
	items, err := s.repo.ListSponsors(ctx, eventID)
	if err != nil {
		return nil, apperrors.New(http.StatusInternalServerError, "event_sponsors_list_failed", "failed to list event sponsors", err)
	}
	if !event.ViewerCanManage {
		filtered := items[:0]
		for _, item := range items {
			if !item.IsActive {
				continue
			}
			item.ContactName = ""
			item.ContactEmail = ""
			filtered = append(filtered, item)
		}
		items = filtered
	}
	return items, nil
}

func (s *Service) CreateSponsor(ctx context.Context, eventID, actorID string, input eventsrepo.CreateSponsorInput) (eventsrepo.EventSponsor, error) {
	if err := validateEventAndActor(eventID, actorID); err != nil {
		return eventsrepo.EventSponsor{}, err
	}
	if err := s.ensureCanManage(ctx, eventID, actorID); err != nil {
		return eventsrepo.EventSponsor{}, err
	}
	input = normalizeSponsorInput(input)
	if err := validateSponsorInput(input.Name, input.Tier, input.LogoMediaID, input.WebsiteURL, input.SocialURL); err != nil {
		return eventsrepo.EventSponsor{}, err
	}
	if err := s.ensureSponsorLogoBelongsToEvent(ctx, eventID, input.LogoMediaID); err != nil {
		return eventsrepo.EventSponsor{}, err
	}
	item, err := s.repo.CreateSponsor(ctx, eventID, input)
	if err != nil {
		return eventsrepo.EventSponsor{}, apperrors.New(http.StatusInternalServerError, "event_sponsor_create_failed", "failed to create event sponsor", err)
	}
	return item, nil
}

func (s *Service) UpdateSponsor(ctx context.Context, eventID, sponsorID, actorID string, input eventsrepo.UpdateSponsorInput) (eventsrepo.EventSponsor, error) {
	if err := validateEventAndActor(eventID, actorID); err != nil {
		return eventsrepo.EventSponsor{}, err
	}
	if _, err := uuid.Parse(sponsorID); err != nil {
		return eventsrepo.EventSponsor{}, invalidUUID("sponsorId")
	}
	if err := s.ensureCanManage(ctx, eventID, actorID); err != nil {
		return eventsrepo.EventSponsor{}, err
	}
	input.SponsorID = sponsorID
	normalizeUpdateSponsorInput(&input)
	if err := validateSponsorPatch(input); err != nil {
		return eventsrepo.EventSponsor{}, err
	}
	if input.LogoMediaID != nil {
		if err := s.ensureSponsorLogoBelongsToEvent(ctx, eventID, *input.LogoMediaID); err != nil {
			return eventsrepo.EventSponsor{}, err
		}
	}
	item, err := s.repo.UpdateSponsor(ctx, eventID, input)
	if err != nil {
		if eventsrepo.IsNoRows(err) {
			return eventsrepo.EventSponsor{}, apperrors.New(http.StatusNotFound, "event_sponsor_not_found", "event sponsor not found", err)
		}
		return eventsrepo.EventSponsor{}, apperrors.New(http.StatusInternalServerError, "event_sponsor_update_failed", "failed to update event sponsor", err)
	}
	return item, nil
}

func (s *Service) DeleteSponsor(ctx context.Context, eventID, sponsorID, actorID string) error {
	if err := validateEventAndActor(eventID, actorID); err != nil {
		return err
	}
	if _, err := uuid.Parse(sponsorID); err != nil {
		return invalidUUID("sponsorId")
	}
	if err := s.ensureCanManage(ctx, eventID, actorID); err != nil {
		return err
	}
	if err := s.repo.DeleteSponsor(ctx, eventID, sponsorID); err != nil {
		if eventsrepo.IsNoRows(err) {
			return apperrors.New(http.StatusNotFound, "event_sponsor_not_found", "event sponsor not found", err)
		}
		return apperrors.New(http.StatusInternalServerError, "event_sponsor_delete_failed", "failed to delete event sponsor", err)
	}
	return nil
}

func (s *Service) ListPosts(ctx context.Context, eventID, viewerUserID string) ([]eventsrepo.EventPost, error) {
	event, err := s.ensureCanViewEventPosts(ctx, eventID, viewerUserID)
	if err != nil {
		return nil, err
	}
	if !event.ViewerCanManage && !event.PostsEnabled {
		return nil, apperrors.New(http.StatusForbidden, "forbidden", "event posts are not enabled", nil)
	}
	items, err := s.repo.ListPosts(ctx, eventID, strings.TrimSpace(viewerUserID), event.ViewerCanManage)
	if err != nil {
		return nil, apperrors.New(http.StatusInternalServerError, "event_posts_list_failed", "failed to list event posts", err)
	}
	return items, nil
}

func (s *Service) CreatePost(ctx context.Context, eventID, actorID string, input eventsrepo.CreatePostInput) (eventsrepo.EventPost, error) {
	if err := validateEventAndActor(eventID, actorID); err != nil {
		return eventsrepo.EventPost{}, err
	}
	event, err := s.GetEvent(ctx, eventID, actorID)
	if err != nil {
		return eventsrepo.EventPost{}, err
	}
	if !event.PostsEnabled {
		return eventsrepo.EventPost{}, apperrors.New(http.StatusConflict, "event_posts_disabled", "posts are not enabled for this event", nil)
	}
	if !event.ViewerCanManage {
		return eventsrepo.EventPost{}, apperrors.New(http.StatusForbidden, "forbidden", "only organizers can create event updates", nil)
	}
	input = normalizePostInput(input)
	if input.PostType == "" {
		return eventsrepo.EventPost{}, invalidEnum("postType")
	}
	if input.BodyMarkdown == "" {
		return eventsrepo.EventPost{}, required("bodyMarkdown")
	}
	item, err := s.repo.CreatePost(ctx, eventID, actorID, input)
	if err != nil {
		return eventsrepo.EventPost{}, apperrors.New(http.StatusInternalServerError, "event_post_create_failed", "failed to create event post", err)
	}
	return item, nil
}

func (s *Service) UpdatePost(ctx context.Context, eventID, postID, actorID string, input eventsrepo.UpdatePostInput) (eventsrepo.EventPost, error) {
	if err := validateEventAndActor(eventID, actorID); err != nil {
		return eventsrepo.EventPost{}, err
	}
	if _, err := uuid.Parse(postID); err != nil {
		return eventsrepo.EventPost{}, invalidUUID("postId")
	}
	event, err := s.GetEvent(ctx, eventID, actorID)
	if err != nil {
		return eventsrepo.EventPost{}, err
	}
	_, err = s.repo.GetPost(ctx, eventID, postID)
	if err != nil {
		if eventsrepo.IsNoRows(err) {
			return eventsrepo.EventPost{}, apperrors.New(http.StatusNotFound, "event_post_not_found", "event post not found", err)
		}
		return eventsrepo.EventPost{}, apperrors.New(http.StatusInternalServerError, "event_post_get_failed", "failed to fetch event post", err)
	}
	if !event.ViewerCanManage {
		return eventsrepo.EventPost{}, apperrors.New(http.StatusForbidden, "forbidden", "only organizers can edit event updates", nil)
	}
	input.PostID = postID
	normalizeUpdatePostInput(&input)
	if input.BodyMarkdown != nil && *input.BodyMarkdown == "" {
		return eventsrepo.EventPost{}, required("bodyMarkdown")
	}
	if input.Status != nil && normalizePostStatus(*input.Status) == "" {
		return eventsrepo.EventPost{}, invalidEnum("status")
	}
	if input.PostType != nil && normalizePostType(*input.PostType) == "" {
		return eventsrepo.EventPost{}, invalidEnum("postType")
	}
	item, err := s.repo.UpdatePost(ctx, eventID, input)
	if err != nil {
		if eventsrepo.IsNoRows(err) {
			return eventsrepo.EventPost{}, apperrors.New(http.StatusNotFound, "event_post_not_found", "event post not found", err)
		}
		return eventsrepo.EventPost{}, apperrors.New(http.StatusInternalServerError, "event_post_update_failed", "failed to update event post", err)
	}
	return item, nil
}

func (s *Service) DeletePost(ctx context.Context, eventID, postID, actorID string) error {
	if err := validateEventAndActor(eventID, actorID); err != nil {
		return err
	}
	if _, err := uuid.Parse(postID); err != nil {
		return invalidUUID("postId")
	}
	event, err := s.GetEvent(ctx, eventID, actorID)
	if err != nil {
		return err
	}
	_, err = s.repo.GetPost(ctx, eventID, postID)
	if err != nil {
		if eventsrepo.IsNoRows(err) {
			return apperrors.New(http.StatusNotFound, "event_post_not_found", "event post not found", err)
		}
		return apperrors.New(http.StatusInternalServerError, "event_post_get_failed", "failed to fetch event post", err)
	}
	if !event.ViewerCanManage {
		return apperrors.New(http.StatusForbidden, "forbidden", "only organizers can delete event updates", nil)
	}
	if err := s.repo.DeletePost(ctx, eventID, postID); err != nil {
		if eventsrepo.IsNoRows(err) {
			return apperrors.New(http.StatusNotFound, "event_post_not_found", "event post not found", err)
		}
		return apperrors.New(http.StatusInternalServerError, "event_post_delete_failed", "failed to delete event post", err)
	}
	return nil
}

func (s *Service) AddPostFishReaction(ctx context.Context, eventID, postID, actorID string) (eventsrepo.EventPostReactionState, error) {
	if err := validateEventAndActor(eventID, actorID); err != nil {
		return eventsrepo.EventPostReactionState{}, err
	}
	if _, err := uuid.Parse(postID); err != nil {
		return eventsrepo.EventPostReactionState{}, invalidUUID("postId")
	}
	if _, err := s.ensureCanViewEventPosts(ctx, eventID, actorID); err != nil {
		return eventsrepo.EventPostReactionState{}, err
	}
	state, err := s.repo.AddPostFishReaction(ctx, eventID, postID, actorID)
	if err != nil {
		if eventsrepo.IsNoRows(err) {
			return eventsrepo.EventPostReactionState{}, apperrors.New(http.StatusNotFound, "event_post_not_found", "event update not found", err)
		}
		return eventsrepo.EventPostReactionState{}, apperrors.New(http.StatusInternalServerError, "event_post_reaction_failed", "failed to react to event update", err)
	}
	return state, nil
}

func (s *Service) DeletePostFishReaction(ctx context.Context, eventID, postID, actorID string) (eventsrepo.EventPostReactionState, error) {
	if err := validateEventAndActor(eventID, actorID); err != nil {
		return eventsrepo.EventPostReactionState{}, err
	}
	if _, err := uuid.Parse(postID); err != nil {
		return eventsrepo.EventPostReactionState{}, invalidUUID("postId")
	}
	if _, err := s.ensureCanViewEventPosts(ctx, eventID, actorID); err != nil {
		return eventsrepo.EventPostReactionState{}, err
	}
	state, err := s.repo.DeletePostFishReaction(ctx, eventID, postID, actorID)
	if err != nil {
		if eventsrepo.IsNoRows(err) {
			return eventsrepo.EventPostReactionState{}, apperrors.New(http.StatusNotFound, "event_post_not_found", "event update not found", err)
		}
		return eventsrepo.EventPostReactionState{}, apperrors.New(http.StatusInternalServerError, "event_post_reaction_failed", "failed to remove event update reaction", err)
	}
	return state, nil
}

func (s *Service) UpdatePostSettings(ctx context.Context, eventID, actorID string, postsEnabled bool, postCreatePolicy string) (eventsrepo.Event, error) {
	if err := validateEventAndActor(eventID, actorID); err != nil {
		return eventsrepo.Event{}, err
	}
	if err := s.ensureCanManage(ctx, eventID, actorID); err != nil {
		return eventsrepo.Event{}, err
	}
	policy := normalizePostCreatePolicy(postCreatePolicy)
	if policy == "" {
		return eventsrepo.Event{}, invalidEnum("postCreatePolicy")
	}
	return s.UpdateEvent(ctx, eventID, actorID, eventsrepo.UpdateEventInput{
		PostsEnabled:     &postsEnabled,
		PostCreatePolicy: &policy,
	})
}

func (s *Service) UpdateParticipantRole(ctx context.Context, eventID, participantID, actorID, role string) (eventsrepo.EventParticipant, error) {
	if err := validateEventAndActor(eventID, actorID); err != nil {
		return eventsrepo.EventParticipant{}, err
	}
	if _, err := uuid.Parse(participantID); err != nil {
		return eventsrepo.EventParticipant{}, invalidUUID("participantId")
	}
	normalizedRole := normalizeParticipantRole(role)
	if normalizedRole == "" {
		return eventsrepo.EventParticipant{}, invalidEnum("role")
	}
	if err := s.ensureCanManage(ctx, eventID, actorID); err != nil {
		return eventsrepo.EventParticipant{}, err
	}
	participant, err := s.repo.UpdateParticipantRole(ctx, eventID, participantID, normalizedRole, actorID)
	if err != nil {
		if eventsrepo.IsNoRows(err) {
			return eventsrepo.EventParticipant{}, apperrors.New(http.StatusNotFound, "participant_not_found", "event participant not found", err)
		}
		if eventsrepo.IsLastOrganizer(err) {
			return eventsrepo.EventParticipant{}, apperrors.New(http.StatusConflict, "last_organizer", "event must keep at least one organizer", err)
		}
		if eventsrepo.IsForbidden(err) {
			return eventsrepo.EventParticipant{}, apperrors.New(http.StatusConflict, "participant_not_confirmed", "only confirmed participants can be made organizer", err)
		}
		return eventsrepo.EventParticipant{}, apperrors.New(http.StatusInternalServerError, "participant_role_update_failed", "failed to update participant role", err)
	}
	return participant, nil
}

func (s *Service) ensureCanViewEventDetails(ctx context.Context, eventID, viewerUserID string) (eventsrepo.Event, error) {
	event, err := s.GetEvent(ctx, eventID, viewerUserID)
	if err != nil {
		return eventsrepo.Event{}, err
	}
	if event.Visibility == "private" && !event.ViewerCanViewPrivateDetails && !event.ViewerCanManage {
		return eventsrepo.Event{}, apperrors.New(http.StatusForbidden, "forbidden", "event details are private", nil)
	}
	return event, nil
}

func (s *Service) ensureCanViewEventPosts(ctx context.Context, eventID, viewerUserID string) (eventsrepo.Event, error) {
	event, err := s.GetEvent(ctx, eventID, viewerUserID)
	if err != nil {
		return eventsrepo.Event{}, err
	}
	if event.ViewerCanManage {
		return event, nil
	}
	if event.Visibility == "private" && !event.ViewerCanViewPrivateDetails {
		return eventsrepo.Event{}, apperrors.New(http.StatusForbidden, "forbidden", "event updates are only visible to event members", nil)
	}
	return event, nil
}

func normalizeProgramInput(input eventsrepo.CreateProgramItemInput) eventsrepo.CreateProgramItemInput {
	input.Title = strings.TrimSpace(input.Title)
	input.DescriptionMarkdown = strings.TrimSpace(input.DescriptionMarkdown)
	input.ProgramDate = strings.TrimSpace(input.ProgramDate)
	input.StartTime = strings.TrimSpace(input.StartTime)
	input.EndTime = strings.TrimSpace(input.EndTime)
	input.Timezone = normalizeTimezone(input.Timezone)
	input.LocationLabel = strings.TrimSpace(input.LocationLabel)
	input.CompetitionID = strings.TrimSpace(input.CompetitionID)
	return input
}

func normalizeUpdateProgramInput(input *eventsrepo.UpdateProgramItemInput) {
	trimStringPtr(&input.Title)
	trimStringPtr(&input.DescriptionMarkdown)
	trimStringPtr(&input.ProgramDate)
	trimStringPtr(&input.StartTime)
	trimStringPtr(&input.EndTime)
	if input.Timezone != nil {
		value := normalizeTimezone(*input.Timezone)
		input.Timezone = &value
	} else if input.ProgramDate != nil || input.StartTime != nil || input.EndTime != nil {
		value := defaultTimezone
		input.Timezone = &value
	}
	trimStringPtr(&input.LocationLabel)
	trimStringPtr(&input.CompetitionID)
}

func validateProgramInput(title, programDate, startTime, endTime, timezoneValue, competitionID string) error {
	if strings.TrimSpace(title) == "" && title != "" {
		return required("title")
	}
	if title == "" && programDate == "" && startTime == "" && endTime == "" && timezoneValue == "" && competitionID == "" {
		return nil
	}
	if title != "" && strings.TrimSpace(title) == "" {
		return required("title")
	}
	if programDate != "" {
		if _, err := time.Parse("2006-01-02", programDate); err != nil {
			return ValidationFailure{Issues: []validatex.Issue{{
				Path: []any{"programDate"}, Code: "invalid_date", Message: "Program date must be YYYY-MM-DD",
			}}}
		}
	}
	if startTime != "" {
		if programDate == "" {
			return ValidationFailure{Issues: []validatex.Issue{{
				Path: []any{"programDate"}, Code: "required", Message: "Program date is required when start time is set",
			}}}
		}
		if _, err := time.Parse("15:04", startTime); err != nil {
			return ValidationFailure{Issues: []validatex.Issue{{
				Path: []any{"startTime"}, Code: "invalid_time", Message: "Start time must be HH:MM",
			}}}
		}
	}
	if endTime != "" {
		if startTime == "" {
			return ValidationFailure{Issues: []validatex.Issue{{
				Path: []any{"startTime"}, Code: "required", Message: "Start time is required when end time is set",
			}}}
		}
		start, _ := time.Parse("15:04", startTime)
		end, err := time.Parse("15:04", endTime)
		if err != nil {
			return ValidationFailure{Issues: []validatex.Issue{{
				Path: []any{"endTime"}, Code: "invalid_time", Message: "End time must be HH:MM",
			}}}
		}
		if !end.After(start) {
			return ValidationFailure{Issues: []validatex.Issue{{
				Path: []any{"endTime"}, Code: "invalid_range", Message: "End time must be after start time",
			}}}
		}
	}
	if timezoneValue != "" {
		if _, err := time.LoadLocation(timezoneValue); err != nil {
			return ValidationFailure{Issues: []validatex.Issue{{
				Path: []any{"timezone"}, Code: "invalid_timezone", Message: "Timezone must be a valid IANA timezone",
			}}}
		}
	}
	if strings.TrimSpace(competitionID) != "" {
		if _, err := uuid.Parse(competitionID); err != nil {
			return invalidUUID("competitionId")
		}
	}
	return nil
}

func validateCreateProgramInput(input eventsrepo.CreateProgramItemInput) error {
	if strings.TrimSpace(input.Title) == "" {
		return required("title")
	}
	return validateProgramInput(input.Title, input.ProgramDate, input.StartTime, input.EndTime, input.Timezone, input.CompetitionID)
}

func valueOrEmpty(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func (s *Service) ensureProgramCompetitionBelongsToEvent(ctx context.Context, eventID, competitionID string) error {
	if strings.TrimSpace(competitionID) == "" {
		return nil
	}
	exists, err := s.repo.CompetitionBelongsToEvent(ctx, eventID, competitionID)
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "event_competition_lookup_failed", "failed to validate event competition", err)
	}
	if !exists {
		return apperrors.New(http.StatusNotFound, "event_competition_not_found", "event competition not found", nil)
	}
	return nil
}

func (s *Service) ensurePrizeReferencesBelongToEvent(ctx context.Context, eventID, competitionID, sponsorID string) error {
	if strings.TrimSpace(competitionID) != "" {
		exists, err := s.repo.CompetitionBelongsToEvent(ctx, eventID, competitionID)
		if err != nil {
			return apperrors.New(http.StatusInternalServerError, "event_competition_lookup_failed", "failed to validate event competition", err)
		}
		if !exists {
			return apperrors.New(http.StatusNotFound, "event_competition_not_found", "event competition not found", nil)
		}
	}
	if strings.TrimSpace(sponsorID) != "" {
		exists, err := s.repo.SponsorBelongsToEvent(ctx, eventID, sponsorID)
		if err != nil {
			return apperrors.New(http.StatusInternalServerError, "event_sponsor_lookup_failed", "failed to validate event sponsor", err)
		}
		if !exists {
			return apperrors.New(http.StatusNotFound, "event_sponsor_not_found", "event sponsor not found", nil)
		}
	}
	return nil
}

func (s *Service) ensureSponsorLogoBelongsToEvent(ctx context.Context, eventID, logoMediaID string) error {
	if strings.TrimSpace(logoMediaID) == "" {
		return nil
	}
	exists, err := s.repo.MediaBelongsToEvent(ctx, eventID, logoMediaID)
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "event_sponsor_logo_lookup_failed", "failed to validate sponsor logo", err)
	}
	if !exists {
		return apperrors.New(http.StatusNotFound, "event_sponsor_logo_not_found", "sponsor logo not found", nil)
	}
	return nil
}

func normalizeCompetitionInput(input eventsrepo.CreateCompetitionInput) eventsrepo.CreateCompetitionInput {
	input.Name = strings.TrimSpace(input.Name)
	input.DescriptionMarkdown = strings.TrimSpace(input.DescriptionMarkdown)
	input.RulesMarkdown = strings.TrimSpace(input.RulesMarkdown)
	input.CoverPhotoURL = strings.TrimSpace(input.CoverPhotoURL)
	return input
}

func normalizeUpdateCompetitionInput(input *eventsrepo.UpdateCompetitionInput) {
	trimStringPtr(&input.Name)
	trimStringPtr(&input.DescriptionMarkdown)
	trimStringPtr(&input.RulesMarkdown)
	trimStringPtr(&input.CoverPhotoURL)
}

func normalizePrizeInput(input eventsrepo.CreatePrizeInput) eventsrepo.CreatePrizeInput {
	input.CompetitionID = strings.TrimSpace(input.CompetitionID)
	input.Title = strings.TrimSpace(input.Title)
	input.DescriptionMarkdown = strings.TrimSpace(input.DescriptionMarkdown)
	input.PhotoURL = strings.TrimSpace(input.PhotoURL)
	input.Placement = normalizePrizePlacement(input.Placement)
	input.PlacementLabel = strings.TrimSpace(input.PlacementLabel)
	input.PrizeType = normalizePrizeType(input.PrizeType)
	input.Currency = normalizeCurrency(input.Currency)
	input.SponsorID = strings.TrimSpace(input.SponsorID)
	return input
}

func normalizeUpdatePrizeInput(input *eventsrepo.UpdatePrizeInput) {
	trimStringPtr(&input.CompetitionID)
	trimStringPtr(&input.Title)
	trimStringPtr(&input.DescriptionMarkdown)
	trimStringPtr(&input.PhotoURL)
	if input.Placement != nil {
		value := normalizePrizePlacement(*input.Placement)
		input.Placement = &value
	}
	trimStringPtr(&input.PlacementLabel)
	if input.PrizeType != nil {
		value := normalizePrizeType(*input.PrizeType)
		input.PrizeType = &value
	}
	if input.Currency != nil {
		value := normalizeCurrency(*input.Currency)
		input.Currency = &value
	} else if input.Amount != nil || input.PrizeType != nil {
		value := defaultCurrency
		input.Currency = &value
	}
	trimStringPtr(&input.SponsorID)
}

func normalizeSponsorInput(input eventsrepo.CreateSponsorInput) eventsrepo.CreateSponsorInput {
	input.Name = strings.TrimSpace(input.Name)
	input.Tier = normalizeSponsorTier(input.Tier)
	input.Description = strings.TrimSpace(input.Description)
	input.LogoMediaID = strings.TrimSpace(input.LogoMediaID)
	input.WebsiteURL = strings.TrimSpace(input.WebsiteURL)
	input.SocialURL = strings.TrimSpace(input.SocialURL)
	input.ContactName = strings.TrimSpace(input.ContactName)
	input.ContactEmail = strings.TrimSpace(input.ContactEmail)
	return input
}

func normalizeUpdateSponsorInput(input *eventsrepo.UpdateSponsorInput) {
	trimStringPtr(&input.Name)
	if input.Tier != nil {
		value := normalizeSponsorTier(*input.Tier)
		input.Tier = &value
	}
	trimStringPtr(&input.Description)
	trimStringPtr(&input.LogoMediaID)
	trimStringPtr(&input.WebsiteURL)
	trimStringPtr(&input.SocialURL)
	trimStringPtr(&input.ContactName)
	trimStringPtr(&input.ContactEmail)
}

func normalizePostInput(input eventsrepo.CreatePostInput) eventsrepo.CreatePostInput {
	input.PostType = normalizePostType(input.PostType)
	input.Title = strings.TrimSpace(input.Title)
	input.BodyMarkdown = strings.TrimSpace(input.BodyMarkdown)
	return input
}

func normalizeUpdatePostInput(input *eventsrepo.UpdatePostInput) {
	if input.PostType != nil {
		value := normalizePostType(*input.PostType)
		input.PostType = &value
	}
	trimStringPtr(&input.Title)
	trimStringPtr(&input.BodyMarkdown)
	if input.Status != nil {
		value := normalizePostStatus(*input.Status)
		input.Status = &value
	}
}

func normalizePostType(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "", "general":
		return "general"
	case "announcement":
		return "announcement"
	case "schedule":
		return "schedule"
	case "logistics":
		return "logistics"
	case "payment":
		return "payment"
	case "competition":
		return "competition"
	case "results":
		return "results"
	default:
		return ""
	}
}

func trimStringPtr(value **string) {
	if value == nil || *value == nil {
		return
	}
	trimmed := strings.TrimSpace(**value)
	*value = &trimmed
}

func normalizePrizePlacement(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "winner":
		return "winner"
	case "champion":
		return "champion"
	case "1st", "1st_place", "first_place":
		return "first_place"
	case "2nd", "2nd_place", "second_place":
		return "second_place"
	case "3rd", "3rd_place", "third_place":
		return "third_place"
	case "special_award", "special":
		return "special_award"
	case "sponsor_award", "sponsor":
		return "sponsor_award"
	default:
		return "custom"
	}
}

func normalizePrizeType(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "":
		return ""
	case "cash", "item", "certificate", "sponsor_gift", "other":
		return strings.ToLower(strings.TrimSpace(value))
	default:
		return "__invalid__"
	}
}

func normalizeSponsorTier(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "":
		return ""
	case "presenting", "major", "minor", "partner", "community", "media", "other":
		return strings.ToLower(strings.TrimSpace(value))
	default:
		return "__invalid__"
	}
}

func normalizePostStatus(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "published", "hidden", "deleted":
		return strings.ToLower(strings.TrimSpace(value))
	default:
		return ""
	}
}

func normalizeParticipantRole(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "participant":
		return "participant"
	case "organizer":
		return "organizer"
	default:
		return ""
	}
}

func validateCompetitionFields(name string) error {
	if strings.TrimSpace(name) == "" {
		return required("name")
	}
	return nil
}

func validatePrizeInput(title, competitionID, sponsorID, placement, prizeType string, amount *float64) error {
	if strings.TrimSpace(title) == "" {
		return required("title")
	}
	if err := validateOptionalUUID("competitionId", competitionID); err != nil {
		return err
	}
	if err := validateOptionalUUID("sponsorId", sponsorID); err != nil {
		return err
	}
	if placement == "" {
		return invalidEnum("placement")
	}
	if prizeType == "__invalid__" {
		return invalidEnum("prizeType")
	}
	if amount != nil && *amount < 0 {
		return invalidNumber("amount", "Amount must be non-negative")
	}
	return nil
}

func validatePrizePatch(input eventsrepo.UpdatePrizeInput) error {
	if input.Title != nil && strings.TrimSpace(*input.Title) == "" {
		return required("title")
	}
	if input.CompetitionID != nil {
		if err := validateOptionalUUID("competitionId", *input.CompetitionID); err != nil {
			return err
		}
	}
	if input.SponsorID != nil {
		if err := validateOptionalUUID("sponsorId", *input.SponsorID); err != nil {
			return err
		}
	}
	if input.Placement != nil && *input.Placement == "" {
		return invalidEnum("placement")
	}
	if input.PrizeType != nil && *input.PrizeType == "__invalid__" {
		return invalidEnum("prizeType")
	}
	if input.Amount != nil && *input.Amount < 0 {
		return invalidNumber("amount", "Amount must be non-negative")
	}
	return nil
}

func validateSponsorInput(name, tier, logoMediaID, websiteURL, socialURL string) error {
	if strings.TrimSpace(name) == "" {
		return required("name")
	}
	if tier == "__invalid__" {
		return invalidEnum("tier")
	}
	if err := validateOptionalUUID("logoMediaId", logoMediaID); err != nil {
		return err
	}
	if err := validateOptionalExternalURL("websiteUrl", websiteURL); err != nil {
		return err
	}
	return validateOptionalExternalURL("socialUrl", socialURL)
}

func validateSponsorPatch(input eventsrepo.UpdateSponsorInput) error {
	if input.Name != nil && strings.TrimSpace(*input.Name) == "" {
		return required("name")
	}
	if input.Tier != nil && *input.Tier == "__invalid__" {
		return invalidEnum("tier")
	}
	if input.LogoMediaID != nil {
		if err := validateOptionalUUID("logoMediaId", *input.LogoMediaID); err != nil {
			return err
		}
	}
	if input.WebsiteURL != nil {
		if err := validateOptionalExternalURL("websiteUrl", *input.WebsiteURL); err != nil {
			return err
		}
	}
	if input.SocialURL != nil {
		return validateOptionalExternalURL("socialUrl", *input.SocialURL)
	}
	return nil
}

func validateOptionalUUID(field, value string) error {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	if _, err := uuid.Parse(strings.TrimSpace(value)); err != nil {
		return invalidUUID(field)
	}
	return nil
}

func validateOptionalExternalURL(field, value string) error {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	parsed, err := url.Parse(value)
	if err != nil || parsed.Host == "" {
		return invalidURL(field)
	}
	switch strings.ToLower(parsed.Scheme) {
	case "http", "https":
		return nil
	default:
		return invalidURL(field)
	}
}

func invalidEnum(field string) error {
	return ValidationFailure{Issues: []validatex.Issue{{
		Path:    []any{field},
		Code:    "invalid",
		Message: "Invalid value",
	}}}
}

func invalidURL(field string) error {
	return ValidationFailure{Issues: []validatex.Issue{{
		Path:    []any{field},
		Code:    "invalid",
		Message: "URL must use http or https",
	}}}
}

func invalidNumber(field, message string) error {
	return ValidationFailure{Issues: []validatex.Issue{{
		Path:    []any{field},
		Code:    "invalid",
		Message: message,
	}}}
}
