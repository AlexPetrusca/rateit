package com.rateit.backend.repository;

import com.rateit.backend.entity.TourneyMatch;
import com.rateit.backend.entity.TourneyTournament;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TourneyMatchRepository extends JpaRepository<TourneyMatch, Long> {
    List<TourneyMatch> findByTournamentOrderByRoundNumberAscIdAsc(TourneyTournament tournament);
    void deleteByTournament(TourneyTournament tournament);

    // Every finished game the given Critic user played in, newest first. The joins
    // are all left joins on purpose: a team's second player can be null, and an
    // implicit inner join would silently drop those games from the history.
    //
    // No `distinct`: every join here is to-one (match -> team -> player -> user), so
    // there is no fan-out to collapse. Adding it makes Postgres reject the query
    // outright, because the ORDER BY columns aren't in the DISTINCT select list.
    @Query("""
        select m from TourneyMatch m
        left join m.teamA teamA
        left join teamA.playerOne teamAOne
        left join teamA.playerTwo teamATwo
        left join teamAOne.criticUser teamAOneUser
        left join teamATwo.criticUser teamATwoUser
        left join m.teamB teamB
        left join teamB.playerOne teamBOne
        left join teamB.playerTwo teamBTwo
        left join teamBOne.criticUser teamBOneUser
        left join teamBTwo.criticUser teamBTwoUser
        where m.teamAScore is not null
          and m.teamBScore is not null
          and (
            teamAOneUser.id = :criticUserId
            or teamATwoUser.id = :criticUserId
            or teamBOneUser.id = :criticUserId
            or teamBTwoUser.id = :criticUserId
          )
        order by m.tournament.tournamentDate desc, m.roundNumber desc, m.id desc
        """)
    List<TourneyMatch> findCompletedByCriticUser(@Param("criticUserId") Long criticUserId);
}
